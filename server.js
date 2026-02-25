import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
let serviceAccount;

// Try to load from environment variable first (for Railway)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log('✅ Loaded Firebase credentials from environment variable');
  } catch (error) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:', error.message);
    process.exit(1);
  }
} else {
  // Fallback to local file for development
  try {
    const serviceAccountPath = join(__dirname, 'suredeal-69c36-firebase-adminsdk-fbsvc-39420527e4.json');
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    console.log('✅ Loaded Firebase credentials from local file');
  } catch (error) {
    console.error('❌ Failed to load Firebase credentials:', error.message);
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());

// Helper function to normalize comma-separated strings to arrays
const normalizeToArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }
  return [];
};

// Helper function to fix malformed leads array
const normalizeLeads = (leads) => {
  // If already a proper array, return it
  if (Array.isArray(leads)) return leads;
  
  // If it's null or undefined, return empty array
  if (!leads) return [];
  
  // If it's a string that looks like comma-separated objects
  if (typeof leads === 'string') {
    try {
      // Try to wrap in brackets and parse
      const wrapped = `[${leads}]`;
      return JSON.parse(wrapped);
    } catch (e) {
      console.error('Failed to parse leads string:', e);
      return [];
    }
  }
  
  // If it's a single object, wrap it in an array
  if (typeof leads === 'object' && !Array.isArray(leads)) {
    return [leads];
  }
  
  return [];
};

// Preprocessing middleware to normalize request body
const normalizeRequestBody = (req, res, next) => {
  try {
    const body = req.body;

    // Normalize company_info fields
    if (body.company_info) {
      body.company_info = {
        ...body.company_info,
        products_services: normalizeToArray(body.company_info.products_services),
        geographic_focus: normalizeToArray(body.company_info.geographic_focus),
        value_propositions: normalizeToArray(body.company_info.value_propositions),
        pain_points_solved: normalizeToArray(body.company_info.pain_points_solved),
        tech_stack: normalizeToArray(body.company_info.tech_stack)
      };
    }

    // Normalize apollo_filters fields
    if (body.apollo_filters) {
      body.apollo_filters = {
        ...body.apollo_filters,
        person_titles: normalizeToArray(body.apollo_filters.person_titles),
        person_seniorities: normalizeToArray(body.apollo_filters.person_seniorities),
        person_locations: normalizeToArray(body.apollo_filters.person_locations),
        organization_num_employees_ranges: normalizeToArray(body.apollo_filters.organization_num_employees_ranges),
        q_keywords: normalizeToArray(body.apollo_filters.q_keywords),
        person_not_titles: normalizeToArray(body.apollo_filters.person_not_titles)
      };
    }

    // Normalize leads array
    body.leads = normalizeLeads(body.leads);

    next();
  } catch (error) {
    console.error('Error normalizing request body:', error);
    return res.status(400).json({
      success: false,
      error: 'Failed to normalize request data: ' + error.message
    });
  }
};

// API route to save results from Make.com
app.post('/api/save-results', normalizeRequestBody, async (req, res) => {
  try {
    const { submission_id, user_id, user_email, user_name, company_info, apollo_filters, leads } = req.body;

    // Validate required fields
    if (!submission_id || !user_id) {
      return res.status(500).json({ 
        success: false, 
        error: 'Missing required fields: submission_id and user_id' 
      });
    }

    // Log normalized data for debugging
    console.log('Normalized company_info:', JSON.stringify(company_info, null, 2));
    console.log('Normalized apollo_filters:', JSON.stringify(apollo_filters, null, 2));
    console.log('Normalized leads count:', leads?.length || 0);

    // 1. Save company_info document with normalized apollo_filters
    const companyInfoRef = await db.collection('company_info').add({
      ...company_info,
      apollo_filters: apollo_filters || {},
      user_id,
      submission_id,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const company_info_id = companyInfoRef.id;
    console.log(`Created company_info doc: ${company_info_id}`);

    // 2. Save leads documents
    let leads_saved = 0;
    if (leads && Array.isArray(leads) && leads.length > 0) {
      const batch = db.batch();
      
      leads.forEach((lead) => {
        const leadRef = db.collection('leads').doc();
        batch.set(leadRef, {
          ...lead,
          user_id,
          submission_id,
          company_info_id,
          status: 'new',
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      leads_saved = leads.length;
      console.log(`Created ${leads_saved} lead documents`);
    }

    // 3. Update submission status to completed (or create if doesn't exist)
    const submissionRef = db.collection('submissions').doc(submission_id);
    const submissionDoc = await submissionRef.get();
    
    if (submissionDoc.exists) {
      // Update existing submission
      await submissionRef.update({
        status: 'completed',
        company_info_id,
        total_leads: leads_saved,
        completed_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Updated submission ${submission_id} to completed`);
    } else {
      // Create new submission if it doesn't exist
      await submissionRef.set({
        user_id,
        user_email: user_email || '',
        user_name: user_name || '',
        submission_type: 'webhook',
        status: 'completed',
        company_info_id,
        total_leads: leads_saved,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        completed_at: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Created new submission ${submission_id} as completed`);
    }

    res.status(200).json({
      success: true,
      company_info_id,
      leads_saved
    });

  } catch (error) {
    console.error('Error saving results:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
