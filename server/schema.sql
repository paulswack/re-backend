-- ============================================================
-- RE Back Office — Database Schema
-- Run this in Supabase SQL Editor (Settings → SQL Editor → New Query)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TEAMS (each subscription is a team)
-- ============================================================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'My Team',
  plan TEXT NOT NULL DEFAULT 'trial', -- trial, solo, team, free
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day'),
  account_type TEXT DEFAULT 'paid', -- paid, admin_free, free
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS (team members)
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Agent', -- Team Lead, Broker Associate, Agent, Assistant
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  license_number TEXT,
  brokerage TEXT,
  assigned_to UUID REFERENCES users(id),
  profile JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, username)
);

-- ============================================================
-- TRANSACTIONS (escrows)
-- ============================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  type TEXT DEFAULT 'Buyer', -- Buyer, Seller, Dual
  status TEXT DEFAULT 'active', -- active, pending, closed
  price NUMERIC(12,2) DEFAULT 0,
  agent_id UUID REFERENCES users(id),
  agent_name TEXT,
  source TEXT,
  close_date DATE,
  notes TEXT,
  beds INTEGER,
  baths NUMERIC(3,1),
  sqft INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LISTINGS
-- ============================================================
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zip TEXT,
  status TEXT DEFAULT 'active', -- active, new, pending, sold
  price NUMERIC(12,2) DEFAULT 0,
  agent_id UUID REFERENCES users(id),
  agent_name TEXT,
  beds INTEGER,
  baths NUMERIC(3,1),
  sqft INTEGER,
  description TEXT,
  source TEXT,
  listing_date DATE,
  property_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRANSACTION PARTIES (buyers, sellers, lender, title, etc.)
-- ============================================================
CREATE TABLE transaction_parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  party_type TEXT NOT NULL, -- buyer, seller, lender, title_company, inspector, attorney, insurance, hoa, buyers_agent, sellers_agent, escrow_officer
  name TEXT,
  phone TEXT,
  email TEXT,
  company TEXT,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LISTING PARTIES (sellers, contacts)
-- ============================================================
CREATE TABLE listing_parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  party_type TEXT NOT NULL, -- seller, contact
  name TEXT,
  phone TEXT,
  email TEXT,
  company TEXT,
  contact_role TEXT, -- for contacts: lender, title, inspector, etc.
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UPDATES (timeline entries for transactions and listings)
-- ============================================================
CREATE TABLE updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- transaction, listing
  entity_id UUID NOT NULL,
  update_type TEXT NOT NULL, -- offer_accepted, inspection_complete, etc.
  title TEXT,
  detail TEXT,
  author_id UUID REFERENCES users(id),
  author_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHECKLISTS (per deal)
-- ============================================================
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL, -- transaction, listing
  entity_id UUID NOT NULL,
  template_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_by TEXT,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHECKLIST TEMPLATES (team-level)
-- ============================================================
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'escrow', -- escrow, listing
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE checklist_template_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- ============================================================
-- PORTAL LINKS
-- ============================================================
CREATE TABLE portal_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL, -- transaction, listing
  entity_id UUID NOT NULL,
  client_name TEXT,
  client_email TEXT,
  created_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MARKETING (activity tracking)
-- ============================================================
CREATE TABLE marketing_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_id TEXT NOT NULL,
  period_type TEXT NOT NULL, -- weekly, monthly
  period_key TEXT NOT NULL, -- e.g. 2026-W14, 2026-04
  completed BOOLEAN DEFAULT TRUE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, activity_id, period_key)
);

-- ============================================================
-- REVIEW REQUESTS
-- ============================================================
CREATE TABLE review_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT,
  address TEXT,
  platform TEXT,
  status TEXT DEFAULT 'pending', -- pending, sent, received
  rating INTEGER,
  review_text TEXT,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REVIEW SCORECARD (per user per platform)
-- ============================================================
CREATE TABLE review_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  review_count INTEGER DEFAULT 0,
  avg_rating NUMERIC(2,1) DEFAULT 0,
  goal INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- ============================================================
-- REVIEW LINKS (per user)
-- ============================================================
CREATE TABLE review_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, platform)
);

-- ============================================================
-- EMAIL TEMPLATES (per user)
-- ============================================================
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- null = team-wide
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  timing TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEETING NOTES
-- ============================================================
CREATE TABLE meeting_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  date DATE,
  wins TEXT,
  challenges TEXT,
  goals_text TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE meeting_action_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meeting_notes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0
);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  author_name TEXT,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AGENT GOALS
-- ============================================================
CREATE TABLE agent_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  closings_goal INTEGER DEFAULT 8,
  volume_goal NUMERIC(14,2) DEFAULT 2000000,
  UNIQUE(user_id, year)
);

-- ============================================================
-- VENDORS
-- ============================================================
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  notes TEXT,
  rating INTEGER,
  is_preferred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BOLD 100 (contact tracking)
-- ============================================================
CREATE TABLE bold100_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sprint_key TEXT NOT NULL, -- e.g. 2026-03-31
  contact_name TEXT,
  contact_type TEXT, -- call, text, email, in_person
  day_number INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- KNOWLEDGE BASE
-- ============================================================
CREATE TABLE knowledge_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  author_id UUID REFERENCES users(id),
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RECRUITING
-- ============================================================
CREATE TABLE recruits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  current_brokerage TEXT,
  recruit_role TEXT,
  years_experience INTEGER,
  status TEXT DEFAULT 'prospect', -- prospect, contacted, interviewing, offered, joined, passed
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), -- null = team-wide
  type TEXT NOT NULL,
  title TEXT,
  detail TEXT,
  link_page TEXT,
  link_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (multi-tenant isolation)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE bold100_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recruits ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Service role policies (our backend uses the service role key, which bypasses RLS)
-- These policies are for the anon/public role (client portal access)
CREATE POLICY "Portal links are public readable by token"
  ON portal_links FOR SELECT
  USING (true);

CREATE POLICY "Transactions readable for portal"
  ON transactions FOR SELECT
  USING (true);

CREATE POLICY "Listings readable for portal"
  ON listings FOR SELECT
  USING (true);

CREATE POLICY "Updates readable for portal"
  ON updates FOR SELECT
  USING (true);

CREATE POLICY "Transaction parties readable for portal"
  ON transaction_parties FOR SELECT
  USING (true);

CREATE POLICY "Listing parties readable for portal"
  ON listing_parties FOR SELECT
  USING (true);

CREATE POLICY "Users readable for portal"
  ON users FOR SELECT
  USING (true);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_users_team ON users(team_id);
CREATE INDEX idx_transactions_team ON transactions(team_id);
CREATE INDEX idx_transactions_agent ON transactions(agent_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_listings_team ON listings(team_id);
CREATE INDEX idx_listings_agent ON listings(agent_id);
CREATE INDEX idx_updates_entity ON updates(entity_type, entity_id);
CREATE INDEX idx_checklists_entity ON checklists(entity_type, entity_id);
CREATE INDEX idx_portal_links_token ON portal_links(token);
CREATE INDEX idx_marketing_user_period ON marketing_activities(user_id, period_key);
CREATE INDEX idx_review_requests_user ON review_requests(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_teams_updated BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_transactions_updated BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_listings_updated BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_meeting_notes_updated BEFORE UPDATE ON meeting_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_recruits_updated BEFORE UPDATE ON recruits FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_knowledge_articles_updated BEFORE UPDATE ON knowledge_articles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
