/* ============================================================
   RE Back Office — Knowledge Base & Training Page
   ============================================================ */

(function () {
  'use strict';

  Auth.requireAuth();
  populateSidebarUser();
  setActiveNav();
  initSidebarToggle();
  applyPageColor('knowledge-base');

  document.getElementById('logoutBtn').addEventListener('click', function () {
    Auth.logout();
  });

  var STORAGE_KEY = 'reb_knowledge_base';
  var PROGRESS_KEY = 'reb_training_progress';
  var pageBody = document.getElementById('pageBody');
  var currentView = 'list'; // list, detail, form
  var currentFilter = 'All';
  var searchQuery = '';
  var viewingId = null;
  var editingId = null;

  // ---- Categories with colors ----
  var CATEGORIES = {
    'Scripts & Dialogues':   { bg: '#EEF2FF', text: '#4F46E5' },
    'Objection Handlers':    { bg: '#FEF3C7', text: '#92400E' },
    'SOPs & Processes':      { bg: '#ECFDF5', text: '#065F46' },
    'Training Materials':    { bg: '#F5F3FF', text: '#7C3AED' },
    'Checklists':            { bg: '#DBEAFE', text: '#1E40AF' },
    'Templates & Forms':     { bg: '#FFF1F2', text: '#BE123C' },
    'Market Knowledge':      { bg: '#E0F2FE', text: '#075985' },
    'Team Policies':         { bg: '#F1F5F9', text: '#334155' }
  };

  var CATEGORY_KEYS = Object.keys(CATEGORIES);

  var STEP_TYPES = ['Read', 'Watch', 'Do', 'Quiz', 'Video'];
  var STEP_ICONS = {
    'Read':  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>',
    'Watch': '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    'Do':    '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
    'Quiz':  '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/></svg>',
    'Video': '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
  };

  var DIFFICULTY_COLORS = {
    'beginner':     { bg: '#DCFCE7', text: '#166534' },
    'intermediate': { bg: '#FEF3C7', text: '#92400E' },
    'advanced':     { bg: '#FEE2E2', text: '#991B1B' }
  };

  // ---- Seed data — comprehensive team knowledge base templates ----
  var SEED_DATA = [
    // =============== SCRIPTS & DIALOGUES ===============
    { id: 'kb-001', title: 'Buyer Consultation Script', category: 'Scripts & Dialogues', type: 'article', pinned: true, tags: ['buyer', 'consultation', 'scripts'], videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-01T10:00:00Z',
      content: '# Buyer Consultation Script\n\n## Opening\n"Thank you for meeting with me today! I\'m excited to help you find your perfect home. Before we dive in, I\'d love to learn more about what you\'re looking for."\n\n## Needs Assessment\n1. "What\'s motivating your move right now?"\n2. "Tell me about your ideal neighborhood — what\'s most important?"\n3. "Have you been pre-approved for a mortgage yet?"\n4. "What\'s your timeline for moving?"\n5. "Are there any absolute must-haves or deal-breakers?"\n6. "What does your ideal home look like — style, size, features?"\n7. "Are you working with any other agents currently?"\n\n## Setting Expectations\n"Here\'s how I work — I\'ll set up a custom search based on your criteria, and you\'ll get instant notifications when new homes hit the market. I\'ll preview properties for you when possible, and when we find the right one, I\'ll guide you through every step from offer to closing."\n\n## Value Proposition\n- I have access to off-market properties\n- I negotiate on your behalf to get the best price\n- I coordinate inspections, appraisals, and closing\n- My commission is typically paid by the seller\n\n## Closing\n"Do you have any questions for me? Great — let\'s get your search set up right now. I\'ll also send you our buyer guide with everything you need to know about the process."' },

    { id: 'kb-002', title: 'Listing Presentation Script', category: 'Scripts & Dialogues', type: 'article', pinned: true, tags: ['listing', 'seller', 'scripts', 'presentation'], videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-02T10:00:00Z',
      content: '# Listing Presentation Script\n\n## Pre-Appointment\n- Research the property (tax records, previous sales, neighborhood comps)\n- Prepare CMA with 3-5 comparable properties\n- Print listing presentation folder\n\n## Opening (5 min)\n"Thank you for having me over. Your home is beautiful! Before I share my marketing plan, I\'d love to hear from you — what\'s most important to you in choosing an agent to sell your home?"\n\n## About the Team (5 min)\n- Team production stats and recent sales\n- Our marketing reach and technology\n- Client testimonials and reviews\n- Our unique value proposition\n\n## Pricing Strategy (10 min)\n"Let me walk you through what the market is telling us..."\n- Show comparable sales (sold in last 90 days)\n- Show active competition (what you\'re competing against)\n- Present recommended price range\n- Explain pricing psychology (price it right, get more showings)\n\n## Marketing Plan (10 min)\n- Professional photography and video\n- MLS syndication to 500+ websites\n- Social media campaign (Instagram, Facebook, targeted ads)\n- Open houses and broker tours\n- Email blast to our buyer database\n- Print marketing (flyers, postcards, mailers)\n\n## The Process (5 min)\n- Pre-listing prep and staging recommendations\n- Launch timeline\n- Showing process and feedback\n- Offer presentation and negotiation\n- Closing coordination\n\n## Closing\n"Based on everything we\'ve discussed, are you ready to get started? I\'d love to be your agent."' },

    { id: 'kb-003', title: 'Cold Call / FSBO Script', category: 'Scripts & Dialogues', type: 'article', pinned: false, tags: ['cold call', 'FSBO', 'prospecting', 'scripts'], videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-03T10:00:00Z',
      content: '# Cold Call & FSBO Scripts\n\n## FSBO Script\n"Hi, my name is [Name] with [Team]. I noticed your home for sale on [source]. I\'m not calling to list your home — I actually have buyers looking in your area. Would you be open to letting me bring a qualified buyer through?"\n\n**If yes:** "Great! Can you tell me a little about the property? How many beds and baths? What are you asking?"\n\n**If they ask about commission:** "If I bring you a buyer, the buyer\'s agent commission is something we can discuss. The important thing is getting your home sold at the right price. Can I schedule a time to preview the property?"\n\n---\n\n## Expired Listing Script\n"Hi [Name], this is [Your Name] with [Team]. I see your home was recently on the market and the listing expired. I\'m sorry it didn\'t sell — that must be frustrating. I\'d love to share what I think went wrong and how we can get it sold. Do you have 10 minutes for a quick chat?"\n\n**Common objection: "We\'re taking a break"**\n"I completely understand. When you\'re ready, would it be okay if I stayed in touch? The market changes quickly and timing is everything."\n\n---\n\n## Sphere of Influence Script\n"Hey [Name]! It\'s [Your Name]. I\'m reaching out because I\'m growing my real estate business and I thought of you. Do you know anyone thinking of buying or selling in the next few months? I\'d really appreciate any referrals — and of course, I\'d take great care of them."' },

    { id: 'kb-004', title: 'Open House Scripts & Follow-Up', category: 'Scripts & Dialogues', type: 'article', pinned: false, tags: ['open house', 'scripts', 'follow-up'], videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-04T10:00:00Z',
      content: '# Open House Scripts\n\n## Greeting at the Door\n"Welcome! Thanks for coming out today. Please sign in here — I\'ll be happy to give you a quick tour. Are you currently working with an agent?"\n\n## During the Tour\n- Point out key features and recent upgrades\n- Ask about their search criteria\n- Mention the neighborhood benefits\n- "What do you think so far? Could you see yourself living here?"\n\n## Before They Leave\n"Thanks so much for stopping by! I have a few other properties that are similar to this one — would you like me to send you those listings? What\'s the best email?"\n\n---\n\n## Follow-Up Sequence\n\n### Day 1 (Same evening)\n"Hi [Name], thanks for visiting [Address] today! I hope you enjoyed the tour. As promised, here are a few similar homes in the area: [links]. Let me know if you\'d like to schedule private showings!"\n\n### Day 3\n"Hi [Name], just checking in — did you have a chance to look at those listings I sent? I have a couple of new ones that just hit the market this week."\n\n### Day 7\n"Hey [Name], I wanted to give you a quick market update — [insert relevant stat]. If you\'re still looking, I\'d love to help. No pressure at all!"\n\n### Day 14\n"Hi [Name], just a quick check-in. The market is moving fast right now. If your timeline has changed or you have any questions, I\'m always here. Have a great week!"' },

    // =============== OBJECTION HANDLERS ===============
    { id: 'kb-005', title: 'Top 15 Buyer Objections & Responses', category: 'Objection Handlers', type: 'article', pinned: true, tags: ['buyer', 'objections', 'negotiation'], videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-05T10:00:00Z',
      content: '# Top 15 Buyer Objections\n\n## 1. "We want to wait for prices to drop."\n> "I understand. Let me show you the local data — prices in our area have appreciated X% per year. Waiting could cost more. Plus, interest rates play a huge role in your monthly payment. A 1% rate increase on a $400K home adds $240/month."\n\n## 2. "We found a home on Zillow — can we just go see it?"\n> "Absolutely! I can also show you similar homes that might be even better — sometimes the best deals aren\'t the most visible online."\n\n## 3. "Do we really need a buyer\'s agent?"\n> "A buyer\'s agent negotiates on your behalf, handles inspections, coordinates with lenders, and protects your interests. My services come at no direct cost to you — the seller pays the commission."\n\n## 4. "The inspection found issues."\n> "Every home has findings. Let\'s review together — I\'ll help you distinguish between minor items and real concerns. We can negotiate repairs or credits."\n\n## 5. "We\'re not sure about the neighborhood."\n> "Let me pull crime stats, school ratings, walkability scores, and development plans. I can also connect you with residents."\n\n## 6. "Our lease isn\'t up for 6 months."\n> "Actually, that\'s perfect timing. It typically takes 30-60 days to find the right home and another 30-45 to close. Starting now means you can move in right when your lease ends."\n\n## 7. "We want to think about it."\n> "Of course — this is a big decision. What specifically would you like to think about? I want to make sure you have all the information you need."\n\n## 8. "It\'s too expensive."\n> "I hear you. Let\'s look at the monthly payment rather than the total price. With current rates, this home would be about $X/month. Does that fit your budget?"\n\n## 9. "We\'re going to look at a few more homes first."\n> "That makes sense. Just know that in this market, good homes can go fast. I can set up showings for those other properties this week if you\'d like."\n\n## 10. "Can you lower your commission?"\n> "My commission reflects the full service I provide — marketing, negotiation, transaction management, and protection of your interests. I\'d rather discuss how I can get you the best deal on the home itself."' },

    { id: 'kb-006', title: 'Top 10 Seller Objections & Responses', category: 'Objection Handlers', type: 'article', pinned: false, tags: ['seller', 'objections', 'listing'], videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-06T10:00:00Z',
      content: '# Top 10 Seller Objections\n\n## 1. "Your commission is too high."\n> "I understand it\'s a significant investment. My marketing plan, negotiation skills, and track record typically net sellers more than the difference in commission. My average seller gets X% above asking price."\n\n## 2. "I want to try FSBO first."\n> "I respect that. Did you know that FSBOs sell for an average of 26% less than agent-assisted sales? I\'d love to show you the data and what a professional marketing plan can do."\n\n## 3. "Another agent said they could sell it for more."\n> "I\'d be cautious about an agent who tells you what you want to hear rather than what the market says. Overpricing leads to longer days on market and ultimately a lower sale price. Let me show you the data."\n\n## 4. "We\'re not ready to sell yet."\n> "No problem at all. When do you think you might be ready? I can prepare a market analysis closer to that time so you know exactly what to expect."\n\n## 5. "We had a bad experience with our last agent."\n> "I\'m sorry to hear that. Can you share what went wrong? I want to make sure I address those concerns upfront. Here\'s how I do things differently..."\n\n## 6. "We want to wait for spring."\n> "Spring does bring more buyers, but it also brings more competition from other sellers. Right now there are fewer homes on the market, which means less competition for you. Serious buyers are always looking."\n\n## 7. "I don\'t want strangers in my house."\n> "I completely understand. We use a managed showing system — every visitor is pre-screened, accompanied, and tracked. I can also set up virtual tours to reduce unnecessary visits."\n\n## 8. "The Zestimate says our home is worth more."\n> "Zillow\'s algorithm doesn\'t see inside your home or account for local nuances. A proper CMA using actual sold comparables in your neighborhood is much more accurate. Let me show you."' },

    // =============== SOPs & PROCESSES ===============
    { id: 'kb-007', title: 'New Listing SOP — Step by Step', category: 'SOPs & Processes', type: 'article', pinned: true, tags: ['listing', 'SOP', 'process', 'checklist'], videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-07T10:00:00Z',
      content: '# New Listing Standard Operating Procedure\n\n## Phase 1: Listing Appointment (Day 0)\n- Run CMA with 5+ comparable properties\n- Prepare listing presentation\n- Sign listing agreement\n- Collect keys, access codes, and gate codes\n- Review and sign seller\'s disclosure\n- Discuss pricing strategy\n\n## Phase 2: Pre-Listing Prep (Days 1-5)\n- Order pre-listing inspection (if applicable)\n- Schedule professional photography and drone shots\n- Order sign installation\n- Create property flyer and feature sheet\n- Write MLS description (have seller approve)\n- Verify all property details (sqft, beds, baths, lot, year built)\n- Stage home or provide staging consultation\n- Deep clean recommendation\n\n## Phase 3: Launch Day (Day 6-7)\n- Enter listing in MLS\n- Verify all photos and details are correct\n- Share on social media (Instagram, Facebook, LinkedIn)\n- Send to buyer leads database\n- Email office/team announcement\n- Schedule open house for first weekend\n- Send "Just Listed" postcards to neighborhood\n\n## Phase 4: Active Marketing (Ongoing)\n- Weekly seller updates (calls or emails)\n- Track all showings and collect feedback\n- Share showing feedback with seller\n- Adjust price strategy if needed (14-day check-in)\n- Open houses (minimum first 2 weekends)\n- Monitor competing listings\n\n## Phase 5: Under Contract\n- Update MLS status to Pending\n- Coordinate buyer\'s inspection\n- Monitor all contingency deadlines\n- Coordinate appraisal access\n- Weekly buyer and seller updates\n- Review closing statement\n\n## Phase 6: Closing & Post-Close\n- Schedule final walkthrough\n- Attend closing\n- Deliver keys to buyer\'s agent\n- Remove lockbox and sign\n- Send closing gift to seller\n- Request Google/Zillow review\n- Add to past client database\n- Send 30-day follow-up' },

    { id: 'kb-008', title: 'Buyer Transaction SOP', category: 'SOPs & Processes', type: 'article', pinned: false, tags: ['buyer', 'SOP', 'process', 'escrow'], videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-08T10:00:00Z',
      content: '# Buyer Transaction SOP\n\n## Phase 1: Pre-Offer\n- Verify buyer is pre-approved\n- Set up property search criteria\n- Schedule and attend showings\n- Provide neighborhood and market data\n- Discuss offer strategy\n\n## Phase 2: Offer & Negotiation\n- Write offer with appropriate contingencies\n- Present offer to listing agent\n- Negotiate terms, price, and closing date\n- Get ratified contract signed by all parties\n- Send executed contract to:\n  - Title/escrow company\n  - Lender\n  - Both agents\n\n## Phase 3: In Escrow (Days 1-7)\n- Open escrow and confirm receipt\n- Deliver earnest money within contract timeline\n- Order home inspection\n- Review seller disclosures with buyer\n- Begin loan processing with lender\n\n## Phase 4: Due Diligence (Days 7-21)\n- Attend home inspection\n- Review inspection report with buyer\n- Submit repair request if needed\n- Negotiate repairs/credits\n- Order appraisal through lender\n- Review preliminary title report\n\n## Phase 5: Loan & Closing Prep (Days 21-35)\n- Follow up with lender weekly\n- Review appraisal results\n- Remove contingencies per contract\n- Review closing disclosure (3 days before closing)\n- Schedule final walkthrough\n- Coordinate closing time and location\n- Confirm wire transfer instructions with buyer\n\n## Phase 6: Closing Day\n- Attend final walkthrough\n- Attend closing\n- Deliver keys\n- Send congratulations gift\n- Request review/testimonial\n- Add to past client database' },

    { id: 'kb-009', title: 'Daily Schedule for Top Producers', category: 'SOPs & Processes', type: 'article', pinned: false, tags: ['schedule', 'productivity', 'time management'], videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-09T10:00:00Z',
      content: '# Top Producer Daily Schedule\n\n## Morning Power Hour (7:00 - 8:00 AM)\n- Review daily goals and priorities\n- Check new leads and respond within 5 minutes\n- Review showing schedule for the day\n- Check transaction deadlines and follow-ups\n\n## Lead Generation Block (8:00 - 10:00 AM)\n**This is non-negotiable. Protect this time.**\n- 20+ prospecting calls (sphere, FSBOs, expireds)\n- 10+ follow-up texts or emails\n- Social media engagement (15 min max)\n- Door knocking or pop-bys (if scheduled)\n\n## Client Work (10:00 AM - 12:00 PM)\n- Showings\n- Listing appointments\n- Buyer consultations\n- Contract writing and negotiations\n\n## Lunch & Learning (12:00 - 1:00 PM)\n- Lunch with a referral partner, past client, or sphere contact\n- Or: Listen to real estate podcast/audiobook while eating\n\n## Transaction Management (1:00 - 3:00 PM)\n- Update CRM and pipeline\n- Follow up with lenders, title companies, inspectors\n- Review and send client updates\n- Prepare CMAs and listing presentations\n\n## Marketing & Admin (3:00 - 4:00 PM)\n- Create social media content\n- Review and respond to showing feedback\n- Update listings\n- Handle paperwork and compliance\n\n## End of Day (4:00 - 5:00 PM)\n- Plan tomorrow\'s schedule\n- Send any outstanding client communications\n- Review goals progress\n- Log activities in the system\n\n---\n\n> **Key principle:** Lead generation comes FIRST, not last. The agents who prospect first thing in the morning consistently outperform those who "get to it later."' },

    // =============== TRAINING MATERIALS ===============
    { id: 'kb-010', title: 'New Agent Onboarding', category: 'Training Materials', type: 'training', pinned: true, tags: ['onboarding', 'new agent', 'training'], difficulty: 'beginner', estimatedMinutes: 45, videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-10T10:00:00Z',
      content: '# Welcome to the Team!\n\nThis onboarding training will walk you through everything you need to know to hit the ground running. Complete each step below and check them off as you go.\n\n> Take your time with each step. This is the foundation for your success on our team.',
      steps: [
        { title: 'Read the Team Handbook', type: 'Read', description: 'Review our team policies, commission structure, splits, expectations, and code of conduct.', videoUrl: '' },
        { title: 'Set Up Your Profile', type: 'Do', description: 'Go to your Profile page and add your photo, phone number, and email. This information shows up on the client portal.', videoUrl: '' },
        { title: 'Learn the System', type: 'Do', description: 'Walk through each section of the back office — Dashboard, Listings, Current Escrows, Marketing, Reviews. Click around and get familiar.', videoUrl: '' },
        { title: 'Add Your Review Links', type: 'Do', description: 'Go to Reviews → Review Links tab. Add your Google, Zillow, and other review profile URLs.', videoUrl: '' },
        { title: 'Set Up Your Marketing Activities', type: 'Do', description: 'Go to Marketing and review the weekly and monthly activity checklists. Start checking off what you\'ve done this week.', videoUrl: '' },
        { title: 'Review the Scripts', type: 'Read', description: 'Read through the Buyer Consultation Script and Listing Presentation Script in the Knowledge Base.', videoUrl: '' },
        { title: 'Shadow a Showing or Listing Appointment', type: 'Do', description: 'Ask the team lead to shadow your next showing or listing appointment. Take notes.', videoUrl: '' },
        { title: 'Make Your First 10 Prospecting Calls', type: 'Do', description: 'Using the scripts in the Knowledge Base, make 10 calls to your sphere of influence. Log them in Bold 100.', videoUrl: '' }
      ] },

    { id: 'kb-011', title: 'Mastering the Listing Presentation', category: 'Training Materials', type: 'training', pinned: false, tags: ['listing', 'presentation', 'training', 'seller'], difficulty: 'intermediate', estimatedMinutes: 60, videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-11T10:00:00Z',
      content: '# Mastering the Listing Presentation\n\nThe listing presentation is the single most important skill for growing your business. A strong presentation wins listings, and listings generate buyer leads, sign calls, and sphere expansion.\n\n> **Goal:** After this training, you should be able to deliver a confident 30-minute listing presentation from memory.',
      steps: [
        { title: 'Study the Listing Presentation Script', type: 'Read', description: 'Read through the full Listing Presentation Script in the Knowledge Base. Take notes on the key sections.', videoUrl: '' },
        { title: 'Learn How to Run a CMA', type: 'Do', description: 'Practice pulling comps from the MLS and creating a CMA report. Use our CMA template.', videoUrl: '' },
        { title: 'Practice the Pricing Conversation', type: 'Do', description: 'Role-play the pricing discussion with a partner. Practice handling the "I want more" objection.', videoUrl: '' },
        { title: 'Build Your Personal Marketing Plan Slide', type: 'Do', description: 'Create a one-page marketing plan that showcases what YOU specifically will do to sell their home.', videoUrl: '' },
        { title: 'Rehearse the Full Presentation', type: 'Do', description: 'Practice the entire presentation start to finish — time yourself. Goal: 25-30 minutes. Record yourself.', videoUrl: '' },
        { title: 'Shadow a Live Listing Appointment', type: 'Do', description: 'Attend a listing appointment with the team lead or senior agent. Take notes on what works.', videoUrl: '' },
        { title: 'Deliver Your First Solo Presentation', type: 'Do', description: 'Schedule and deliver your first listing presentation on your own. Debrief with your team lead afterward.', videoUrl: '' }
      ] },

    { id: 'kb-012', title: 'Lead Generation Bootcamp', category: 'Training Materials', type: 'training', pinned: false, tags: ['leads', 'prospecting', 'training'], difficulty: 'intermediate', estimatedMinutes: 90, videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-12T10:00:00Z',
      content: '# Lead Generation Bootcamp\n\nConsistent lead generation is the foundation of a successful real estate career. This bootcamp will teach you the strategies and systems used by top-producing agents.\n\n> **The #1 rule:** Lead gen happens FIRST every day. Not after email. Not after lunch. FIRST.',
      steps: [
        { title: 'Mindset: Why Most Agents Fail at Lead Gen', type: 'Read', description: 'Read about the daily habits and mindset shifts that separate top producers from average agents. The biggest difference is consistency, not talent.', videoUrl: '' },
        { title: 'Build Your Sphere Database', type: 'Do', description: 'Create a list of 100+ people you know — friends, family, former coworkers, neighbors, service providers. Enter them into your phone contacts with a "Sphere" tag.', videoUrl: '' },
        { title: 'Master the Sphere Call Script', type: 'Read', description: 'Read and practice the sphere of influence script: "Hey [Name], I\'m growing my real estate business and thought of you. Do you know anyone thinking of buying or selling?"', videoUrl: '' },
        { title: 'FSBO & Expired Listing Strategies', type: 'Read', description: 'Study the FSBO and Expired scripts. Understand the psychology — they\'re frustrated, not hostile. You\'re offering help.', videoUrl: '' },
        { title: 'Create Your Weekly Prospecting Schedule', type: 'Do', description: 'Block 2 hours every morning for prospecting. Map out which days you\'ll focus on: sphere calls, FSBOs, expireds, door knocking, and follow-ups.', videoUrl: '' },
        { title: 'Social Media Lead Gen Strategy', type: 'Read', description: 'Learn how to generate leads from Instagram, Facebook, and LinkedIn without being salesy. Focus on value-first content.', videoUrl: '' },
        { title: 'Track Your Numbers', type: 'Do', description: 'Start tracking your daily prospecting numbers in Bold 100: calls made, contacts reached, appointments set. What gets measured gets managed.', videoUrl: '' },
        { title: 'Complete the 5-Day Challenge', type: 'Do', description: 'For 5 consecutive days: make 20 prospecting calls, send 10 follow-up texts, and post 1 piece of content on social media. Log everything.', videoUrl: '' }
      ] },

    { id: 'kb-013', title: 'Negotiation Masterclass', category: 'Training Materials', type: 'training', pinned: false, tags: ['negotiation', 'offers', 'training', 'advanced'], difficulty: 'advanced', estimatedMinutes: 60, videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-13T10:00:00Z',
      content: '# Negotiation Masterclass\n\nNegotiation is where deals are made or lost. This training covers the psychology, tactics, and real-world strategies that top agents use to win for their clients.',
      steps: [
        { title: 'Negotiation Psychology Fundamentals', type: 'Read', description: 'Understand the key principles: anchoring, framing, BATNA (Best Alternative to a Negotiated Agreement), and the power of silence.', videoUrl: '' },
        { title: 'Writing Winning Offers', type: 'Read', description: 'Learn what makes an offer stand out: clean terms, strong pre-approval, flexible closing dates, personal letters (where allowed), and escalation clauses.', videoUrl: '' },
        { title: 'Multiple Offer Strategies', type: 'Read', description: 'How to win in multiple offer situations: highest and best, appraisal gap coverage, earnest money strength, and inspection contingency strategies.', videoUrl: '' },
        { title: 'Repair Negotiation Tactics', type: 'Do', description: 'Practice negotiating inspection repairs. Role-play both sides — buyer\'s agent requesting repairs and listing agent pushing back.', videoUrl: '' },
        { title: 'Price Reduction Conversations', type: 'Read', description: 'How to have the difficult conversation with sellers about price reductions. Use data, not opinions. Frame it as the market speaking.', videoUrl: '' },
        { title: 'Real-World Scenario Practice', type: 'Do', description: 'Work through 3 negotiation scenarios with a partner. Debrief each one — what worked, what didn\'t.', videoUrl: '' }
      ] },

    // =============== MARKET KNOWLEDGE ===============
    { id: 'kb-014', title: 'Understanding the Real Estate Market Cycle', category: 'Market Knowledge', type: 'article', pinned: false, tags: ['market', 'economics', 'education'], videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-14T10:00:00Z',
      content: '# Understanding the Real Estate Market Cycle\n\n## The 4 Phases\n\n### 1. Recovery\n- High vacancy, low rents\n- No new construction\n- Best time to buy — prices at bottom\n- Few buyers competing\n\n### 2. Expansion\n- Decreasing vacancy, rising rents\n- New construction begins\n- Increasing demand and prices\n- Best time to sell investment properties\n\n### 3. Hyper-Supply\n- New construction exceeds demand\n- Vacancy begins to rise\n- Price growth slows or plateaus\n- Caution for buyers — don\'t overpay\n\n### 4. Recession\n- Oversupply, falling rents and prices\n- Construction stops\n- Foreclosures may increase\n- Opportunity for investors\n\n---\n\n## Key Indicators to Watch\n- **Months of inventory** — Under 4 months = seller\'s market, 4-6 = balanced, Over 6 = buyer\'s market\n- **Days on market** — trending up or down?\n- **List-to-sale price ratio** — are homes selling above or below asking?\n- **Interest rates** — huge impact on buyer purchasing power\n- **Local job growth** — the #1 driver of housing demand\n- **Building permits** — leading indicator of future supply\n\n> **Pro tip:** Know these numbers for your farm area. When a client asks "how\'s the market?" — you should be able to answer with specific data, not vague generalities.' },

    { id: 'kb-015', title: 'How to Read a CMA Like a Pro', category: 'Market Knowledge', type: 'article', pinned: false, tags: ['CMA', 'pricing', 'comps', 'market analysis'], videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-15T10:00:00Z',
      content: '# How to Read a CMA Like a Pro\n\n## What is a CMA?\nA Comparative Market Analysis is a report that estimates a property\'s value based on recently sold, pending, and active comparable properties.\n\n## Selecting Comparable Properties\n- **Location:** Same neighborhood or within 1 mile\n- **Size:** Within 10-15% of subject property sqft\n- **Age:** Similar year built (within 10 years)\n- **Condition:** Similar level of updates and maintenance\n- **Time:** Sold within last 90 days (6 months max)\n- **Style:** Same property type (single-family vs. condo)\n\n## Adjustments\n- **Bedrooms:** +/- $5,000-15,000 per bedroom\n- **Bathrooms:** +/- $5,000-10,000 per bathroom\n- **Square footage:** $100-200 per sqft (varies by market)\n- **Garage:** +/- $10,000-20,000\n- **Pool:** +/- $10,000-30,000\n- **Updates:** Kitchen and bath remodels add the most value\n- **Lot size:** Adjust for significantly larger/smaller lots\n\n## The Three Types of Comps\n1. **Sold comps** — What the market has already paid (most important)\n2. **Pending comps** — What buyers are currently willing to pay\n3. **Active comps** — What you\'re competing against (not what homes are worth)\n\n## Presenting the CMA\n- Always show a range, not a single number\n- Let the data speak — don\'t argue with clients about price\n- "The market is telling us your home is worth between $X and $Y"\n- Show the best-case and worst-case scenarios' },

    // =============== TEMPLATES & FORMS ===============
    { id: 'kb-016', title: 'Email Templates for Every Situation', category: 'Templates & Forms', type: 'article', pinned: false, tags: ['email', 'templates', 'communication'], videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-16T10:00:00Z',
      content: '# Email Templates\n\n## New Lead Follow-Up\n**Subject:** Quick question about your home search\n\nHi [Name],\n\nThanks for reaching out about real estate in [Area]! I\'d love to help you find the perfect home.\n\nA quick question — what\'s most important to you in your next home? (location, size, budget, timeline?)\n\nI can set up a custom search and send you new listings the moment they hit the market.\n\nLooking forward to connecting!\n[Your Name]\n\n---\n\n## After Showing Follow-Up\n**Subject:** What did you think of [Address]?\n\nHi [Name],\n\nThanks for touring [Address] today! I\'d love to hear your thoughts.\n\nWhat did you like most? Anything that didn\'t work for you?\n\nI have a couple of other properties I think you\'d love — want me to set up showings this week?\n\n[Your Name]\n\n---\n\n## Post-Close Review Request\n**Subject:** A quick favor?\n\nHi [Name],\n\nCongratulations again on your new home! I truly enjoyed working with you.\n\nIf you had a great experience, I\'d really appreciate a quick review — it helps me help more families like yours.\n\n[Review Link]\n\nThank you so much!\n[Your Name]\n\n---\n\n## Past Client Check-In (Annual)\n**Subject:** Happy home anniversary! 🏡\n\nHi [Name],\n\nCan you believe it\'s been [X] years since you [bought/sold] your home? Time flies!\n\nJust wanted to check in and see how everything is going. If you ever need anything real estate related — or know someone who does — I\'m always here.\n\nHope all is well!\n[Your Name]' },

    // =============== TEAM POLICIES ===============
    { id: 'kb-017', title: 'Commission Structure & Splits', category: 'Team Policies', type: 'article', pinned: false, tags: ['commission', 'splits', 'policy', 'pay'], videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-17T10:00:00Z',
      content: '# Commission Structure & Splits\n\n> **Note:** Edit this document with your team\'s specific commission structure.\n\n## Standard Commission Splits\n- **New agents (0-12 months):** [X]% / [X]% (agent/team)\n- **Experienced agents (12+ months):** [X]% / [X]% (agent/team)\n- **Top producers ($X+ volume):** [X]% / [X]% (agent/team)\n\n## What the Team Covers\n- CRM and technology tools\n- Office space and supplies\n- Marketing support and templates\n- Training and coaching\n- Transaction coordination\n- Lead generation systems\n\n## What Agents Cover\n- Individual marketing (social media ads, personal mailers)\n- MLS dues and board fees\n- License renewal and CE courses\n- E&O insurance\n- Personal business expenses\n\n## Referral Policy\n- Team referrals: [X]% referral fee\n- Outside referrals: [X]% referral fee\n- Past client referrals: No fee (they\'re your clients)\n\n## Bonus Structure\n- Quarterly production bonus: [details]\n- Annual volume bonus: [details]\n- Recruiting bonus: [details]\n\n---\n\n*Edit this document with your team\'s actual numbers and policies.*' },

    { id: 'kb-018', title: 'Social Media Policy & Best Practices', category: 'Team Policies', type: 'article', pinned: false, tags: ['social media', 'policy', 'marketing', 'compliance'], videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-18T10:00:00Z',
      content: '# Social Media Policy & Best Practices\n\n## Required Compliance\n- Always include your brokerage name in your bio/profile\n- Include your license number where required by your state\n- Never make guarantees about market performance\n- Get written consent before posting client photos or testimonials\n- Follow Fair Housing guidelines — no discriminatory language\n\n## Content Strategy\n\n### The 80/20 Rule\n- **80% value content:** Market updates, tips, neighborhood highlights, behind-the-scenes\n- **20% promotional:** Just listed, just sold, open houses, testimonials\n\n### Weekly Content Calendar\n- **Monday:** Motivational quote or mindset post\n- **Tuesday:** Market stat or tip\n- **Wednesday:** Behind-the-scenes / day in the life\n- **Thursday:** Client spotlight or testimonial\n- **Friday:** New listing or open house promo\n- **Saturday:** Open house stories and live tours\n- **Sunday:** Personal content (hobbies, family, community)\n\n### Best Practices\n- Post consistently (minimum 3x/week)\n- Use high-quality photos and videos\n- Engage with comments within 1 hour\n- Use local hashtags\n- Share stories daily\n- Go live at open houses\n- Tag locations on every post\n\n### What NOT to Post\n- Complaints about clients or other agents\n- Political opinions (keep it separate from business)\n- Unverified claims about properties\n- Other agents\' listings without permission\n- Anything that could violate Fair Housing' },

    // =============== CHECKLISTS ===============
    { id: 'kb-019', title: 'Open House Preparation Checklist', category: 'Checklists', type: 'article', pinned: false, tags: ['open house', 'checklist', 'preparation'], videoUrl: '', createdBy: 'Team Lead', createdAt: '2026-01-19T10:00:00Z',
      content: '# Open House Preparation Checklist\n\n## 1 Week Before\n- [ ] Confirm date and time with seller\n- [ ] Create open house flyer\n- [ ] Post on MLS and social media\n- [ ] Order directional signs\n- [ ] Invite your database via email\n- [ ] Create Facebook event\n\n## Day Before\n- [ ] Confirm seller will be away during open house\n- [ ] Verify lockbox code works\n- [ ] Prepare sign-in sheets (paper and digital)\n- [ ] Print property flyers (20+ copies)\n- [ ] Prepare CMA packets for interested visitors\n- [ ] Buy refreshments (water, cookies, light snacks)\n\n## Day Of (1 hour before)\n- [ ] Arrive early to set up\n- [ ] Turn on all lights\n- [ ] Open blinds and curtains\n- [ ] Set thermostat to comfortable temperature\n- [ ] Light a candle or use subtle air freshener\n- [ ] Put out sign-in sheet at front door\n- [ ] Place directional signs at nearby intersections\n- [ ] Set up refreshment area\n- [ ] Do a final walkthrough — everything clean and staged?\n- [ ] Start Instagram/Facebook stories\n\n## During the Open House\n- [ ] Greet every visitor at the door\n- [ ] Get everyone to sign in (name, email, phone)\n- [ ] Ask: "Are you working with an agent?"\n- [ ] Give guided tours to serious buyers\n- [ ] Take photos/video for social media\n- [ ] Collect feedback from visitors\n\n## After the Open House\n- [ ] Remove all signs\n- [ ] Lock up and reset thermostat\n- [ ] Send thank-you text to all visitors (same day)\n- [ ] Follow up with unrepresented buyers\n- [ ] Report showing feedback to seller\n- [ ] Update MLS with open house results' }
  ];

  // ---- Helpers ----
  function generateId() {
    return 'kb_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- Video embed helper ----
  function getVideoEmbed(url, width, height) {
    if (!url) return '';
    width = width || '100%';
    height = height || '400';
    var embedUrl = '';

    // YouTube
    var ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
    if (ytMatch) embedUrl = 'https://www.youtube.com/embed/' + ytMatch[1];

    // Vimeo
    var vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) embedUrl = 'https://player.vimeo.com/video/' + vimeoMatch[1];

    // Loom
    var loomMatch = url.match(/loom\.com\/share\/([\w-]+)/);
    if (loomMatch) embedUrl = 'https://www.loom.com/embed/' + loomMatch[1];

    // Google Drive video
    var driveMatch = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if (driveMatch) embedUrl = 'https://drive.google.com/file/d/' + driveMatch[1] + '/preview';

    if (embedUrl) {
      return '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;margin:12px 0;background:#000">' +
        '<iframe src="' + embedUrl + '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allowfullscreen></iframe></div>';
    }

    // Fallback: just show as a link
    return '<div style="margin:12px 0"><a href="' + escapeHtml(url) + '" target="_blank" rel="noopener" style="color:var(--indigo);font-weight:600;text-decoration:none;display:inline-flex;align-items:center;gap:6px"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> Watch Video</a></div>';
  }

  // ---- Rich content renderer (simple markdown-like) ----
  function renderContent(text) {
    if (!text) return '';
    var html = escapeHtml(text);

    // Headers: lines starting with # ## ###
    html = html.replace(/^### (.+)$/gm, '<h4 style="font-size:1rem;font-weight:700;color:#1E293B;margin:16px 0 8px">$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3 style="font-size:1.1rem;font-weight:700;color:#1E293B;margin:20px 0 8px">$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2 style="font-size:1.25rem;font-weight:800;color:#1E293B;margin:24px 0 10px">$1</h2>');

    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Links: [text](url)
    html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--indigo);text-decoration:underline">$1</a>');

    // Bullet lists: lines starting with - or *
    html = html.replace(/^[-*] (.+)$/gm, '<div style="display:flex;gap:8px;padding:2px 0"><span style="color:#94A3B8;flex-shrink:0">•</span><span>$1</span></div>');

    // Numbered lists: lines starting with 1. 2. etc
    html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="display:flex;gap:8px;padding:2px 0"><span style="color:#94A3B8;flex-shrink:0;font-weight:600;min-width:20px">$1.</span><span>$2</span></div>');

    // Horizontal rule: ---
    html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #E2E8F0;margin:16px 0">');

    // Callout blocks: > text
    html = html.replace(/^&gt; (.+)$/gm, '<div style="border-left:3px solid var(--indigo);padding:8px 14px;background:#F8FAFC;border-radius:0 6px 6px 0;margin:8px 0;font-style:italic;color:#475569">$1</div>');

    // Video embeds: [video](url)
    html = html.replace(/\[video\]\((.+?)\)/g, function (m, url) { return getVideoEmbed(url); });

    // Preserve line breaks
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  // ---- Data access ----
  function getItems() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Load starter templates for all new accounts (not just demo)
      var seeded = SEED_DATA.map(function (item) { return item; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    try { return JSON.parse(raw); } catch (e) { return []; }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function getProgress() {
    var session = Auth.getSession();
    if (!session) return {};
    var raw = localStorage.getItem(PROGRESS_KEY);
    var all = {};
    try { all = JSON.parse(raw) || {}; } catch (e) { all = {}; }
    return all[session.username] || {};
  }

  function saveProgress(progress) {
    var session = Auth.getSession();
    if (!session) return;
    var raw = localStorage.getItem(PROGRESS_KEY);
    var all = {};
    try { all = JSON.parse(raw) || {}; } catch (e) { all = {}; }
    all[session.username] = progress;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
  }

  // ---- Badge helpers ----
  function categoryBadge(cat) {
    var c = CATEGORIES[cat] || { bg: '#F1F5F9', text: '#475569' };
    return '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;background:' + c.bg + ';color:' + c.text + ';">' + escapeHtml(cat) + '</span>';
  }

  function typeBadge(type) {
    if (type === 'training') {
      return '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;background:#DBEAFE;color:#1E40AF;">Training</span>';
    }
    return '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;background:#F1F5F9;color:#475569;">Article</span>';
  }

  function difficultyBadge(diff) {
    if (!diff) return '';
    var d = DIFFICULTY_COLORS[diff] || DIFFICULTY_COLORS['beginner'];
    return '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:11px;font-weight:600;background:' + d.bg + ';color:' + d.text + ';">' + diff.charAt(0).toUpperCase() + diff.slice(1) + '</span>';
  }

  function statCard(label, value, color, iconSvg) {
    return '<div class="stat-card" style="background:#fff;border-radius:12px;padding:18px;box-shadow:0 1px 4px rgba(0,0,0,0.06);border:1px solid #E2E8F0;">' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
      '<div class="stat-icon" style="width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:' + color + '20;color:' + color + ';">' + iconSvg + '</div>' +
      '<div>' +
      '<div style="font-size:22px;font-weight:700;color:#1E293B;">' + value + '</div>' +
      '<div style="font-size:13px;color:#64748B;">' + escapeHtml(label) + '</div>' +
      '</div></div></div>';
  }

  // ---- Completion rate calculation ----
  function getCompletionRate() {
    var items = getItems();
    var trainings = items.filter(function (i) { return i.type === 'training' && i.steps && i.steps.length > 0; });
    if (trainings.length === 0) return 0;
    var progress = getProgress();
    var totalSteps = 0;
    var completedSteps = 0;
    trainings.forEach(function (t) {
      totalSteps += t.steps.length;
      var p = progress[t.id] || [];
      completedSteps += p.length;
    });
    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  }

  // ---- Render list view ----
  function renderList() {
    var items = getItems();

    // Stats
    var total = items.length;
    var trainingCount = items.filter(function (i) { return i.type === 'training'; }).length;
    var pinnedCount = items.filter(function (i) { return i.pinned; }).length;
    var completionRate = getCompletionRate();

    // Filter by category
    var filtered = items;
    if (currentFilter !== 'All') {
      filtered = items.filter(function (i) { return i.category === currentFilter; });
    }

    // Filter by search
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      filtered = filtered.filter(function (i) {
        return (i.title && i.title.toLowerCase().indexOf(q) !== -1) ||
               (i.category && i.category.toLowerCase().indexOf(q) !== -1) ||
               (i.tags && i.tags.join(' ').toLowerCase().indexOf(q) !== -1) ||
               (i.content && i.content.toLowerCase().indexOf(q) !== -1);
      });
    }

    // Get active categories
    var activeCats = {};
    items.forEach(function (i) { if (i.category) activeCats[i.category] = true; });
    var activeCatKeys = Object.keys(activeCats).sort();

    var html = '';

    // Header
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">';
    html += '<h2 style="margin:0;font-size:22px;font-weight:700;">Knowledge Base</h2>';
    if (Auth.isPrivileged()) {
      html += '<button class="btn btn-primary" data-action="add-resource" style="display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> Add Resource</button>';
    }
    html += '</div>';

    // Stat cards
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:24px;">';
    html += statCard('Total Resources', total, '#3484D0', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>');
    html += statCard('Training Modules', trainingCount, '#7C3AED', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>');
    html += statCard('Pinned', pinnedCount, '#F59E0B', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17 4v7l2 3v2h-6v5l-1 1-1-1v-5H5v-2l2-3V4c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2z"/></svg>');
    html += statCard('Completion Rate', completionRate + '%', '#10B981', '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>');
    html += '</div>';

    // Learning Path Checklist
    var readKey = PREFIX + 'kb_read';
    var readItems = {};
    try { readItems = JSON.parse(localStorage.getItem(readKey) || '{}'); } catch(e) {}
    var myReads = readItems[session ? session.username : ''] || {};
    var totalArticles = items.length;
    var readCount = Object.keys(myReads).filter(function (k) { return myReads[k]; }).length;
    var readPct = totalArticles > 0 ? Math.round(readCount / totalArticles * 100) : 0;

    html += '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.06);border:1px solid #E2E8F0;margin-bottom:24px;overflow:hidden">';
    html += '<div style="padding:16px 20px;border-bottom:1px solid #F1F5F9;display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="document.getElementById(\'learningPathBody\').style.display=document.getElementById(\'learningPathBody\').style.display===\'none\'?\'\':\'none\';this.querySelector(\'.lp-arrow\').style.transform=document.getElementById(\'learningPathBody\').style.display===\'none\'?\'\':\' rotate(180deg)\'">';
    html += '<div style="display:flex;align-items:center;gap:10px"><svg viewBox="0 0 24 24" width="20" height="20" fill="#6366F1"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>';
    html += '<div><div style="font-size:.92rem;font-weight:700;color:#1E293B">Learning Path</div>';
    html += '<div style="font-size:.72rem;color:#64748B">' + readCount + ' of ' + totalArticles + ' completed (' + readPct + '%)</div></div></div>';
    html += '<div style="display:flex;align-items:center;gap:10px">';
    html += '<div style="width:120px;height:6px;background:#F1F5F9;border-radius:99px;overflow:hidden"><div style="height:100%;width:' + readPct + '%;background:linear-gradient(90deg,#6366F1,#3B82F6);border-radius:99px;transition:width .3s"></div></div>';
    html += '<svg class="lp-arrow" viewBox="0 0 24 24" width="18" height="18" fill="#94A3B8" style="transition:transform .2s"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>';
    html += '</div></div>';

    // Collapsible body grouped by category
    html += '<div id="learningPathBody" style="display:none">';
    var catGroups = {};
    items.forEach(function (item) {
      var cat = item.category || 'Other';
      if (!catGroups[cat]) catGroups[cat] = [];
      catGroups[cat].push(item);
    });
    Object.keys(catGroups).sort().forEach(function (cat) {
      var catItems = catGroups[cat];
      var catDone = catItems.filter(function (i) { return myReads[i.id]; }).length;
      var c = CATEGORIES[cat] || { bg: '#F1F5F9', text: '#475569' };
      html += '<div style="padding:0 20px">';
      html += '<div style="display:flex;align-items:center;gap:8px;padding:12px 0;border-bottom:1px solid #F8FAFC">';
      html += '<span style="display:inline-block;padding:2px 10px;border-radius:99px;font-size:.7rem;font-weight:600;background:' + c.bg + ';color:' + c.text + '">' + escapeHtml(cat) + '</span>';
      html += '<span style="font-size:.72rem;color:#94A3B8;font-weight:600">' + catDone + '/' + catItems.length + '</span>';
      html += '</div>';
      catItems.forEach(function (item) {
        var isRead = !!myReads[item.id];
        html += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #FAFAFA">';
        html += '<input type="checkbox"' + (isRead ? ' checked' : '') + ' data-action="toggle-read" data-item-id="' + item.id + '" style="width:16px;height:16px;accent-color:#6366F1;cursor:pointer;flex-shrink:0">';
        html += '<span style="font-size:.82rem;color:' + (isRead ? '#94A3B8' : '#1E293B') + ';font-weight:' + (isRead ? '400' : '600') + ';' + (isRead ? 'text-decoration:line-through;' : '') + 'cursor:pointer;flex:1" data-action="view-resource" data-id="' + item.id + '">' + escapeHtml(item.title) + '</span>';
        if (item.type === 'training') html += '<span style="font-size:.65rem;font-weight:600;color:#1E40AF;background:#DBEAFE;padding:1px 8px;border-radius:99px">Training</span>';
        html += '</div>';
      });
      html += '</div>';
    });

    // Celebration if all done
    if (readCount === totalArticles && totalArticles > 0) {
      html += '<div style="padding:20px;text-align:center;background:#F0FDF4;border-top:1px solid #D1FAE5">';
      html += '<div style="font-size:1.5rem;margin-bottom:4px">🎉🏆</div>';
      html += '<div style="font-size:.9rem;font-weight:700;color:#065F46">All articles completed! You\'re a knowledge champion.</div>';
      html += '</div>';
    }

    html += '</div></div>';

    // Search bar
    html += '<div style="margin-bottom:16px;">';
    html += '<input type="text" id="kbSearch" class="form-control" placeholder="Search resources by title, category, or tags..." value="' + escapeHtml(searchQuery) + '" style="max-width:400px;">';
    html += '</div>';

    // Filter tabs
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">';
    html += '<button class="lb-filter-btn' + (currentFilter === 'All' ? ' active' : '') + '" data-action="filter" data-filter="All">All</button>';
    activeCatKeys.forEach(function (cat) {
      html += '<button class="lb-filter-btn' + (currentFilter === cat ? ' active' : '') + '" data-action="filter" data-filter="' + escapeHtml(cat) + '">' + escapeHtml(cat) + '</button>';
    });
    html += '</div>';

    // Card grid
    if (filtered.length === 0) {
      html += '<div style="text-align:center;padding:60px 20px;color:#94A3B8;">';
      html += '<svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" style="opacity:0.3;margin-bottom:12px;"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>';
      html += '<p style="font-size:16px;margin:0;">No resources found.</p>';
      html += '</div>';
    } else {
      // Sort: pinned first, then by createdAt desc
      filtered.sort(function (a, b) {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">';
      var progress = getProgress();
      filtered.forEach(function (item) {
        var c = CATEGORIES[item.category] || { bg: '#F1F5F9', text: '#475569' };
        html += '<div class="lb-card" style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden;border:1px solid #E2E8F0;cursor:pointer;transition:box-shadow 0.2s;" data-action="view-item" data-id="' + item.id + '">';
        // Color bar
        html += '<div style="height:4px;background:' + c.text + ';"></div>';
        html += '<div style="padding:16px;">';
        // Top row: category badge + pin icon
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
        html += categoryBadge(item.category);
        if (item.pinned) {
          html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B"><path d="M17 4v7l2 3v2h-6v5l-1 1-1-1v-5H5v-2l2-3V4c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2z"/></svg>';
        }
        html += '</div>';
        // Title
        html += '<div style="font-weight:700;font-size:16px;color:#1E293B;margin-bottom:8px;">' + escapeHtml(item.title) + '</div>';
        // Badges row
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:10px;">';
        html += typeBadge(item.type);
        if (item.type === 'training' && item.difficulty) {
          html += difficultyBadge(item.difficulty);
        }
        if (item.estimatedMinutes) {
          html += '<span style="font-size:12px;color:#64748B;">' + item.estimatedMinutes + ' min</span>';
        }
        html += '</div>';
        // Training progress bar
        if (item.type === 'training' && item.steps && item.steps.length > 0) {
          var p = progress[item.id] || [];
          var pct = Math.round((p.length / item.steps.length) * 100);
          html += '<div style="margin-bottom:8px;">';
          html += '<div style="display:flex;justify-content:space-between;font-size:11px;color:#64748B;margin-bottom:4px;"><span>' + p.length + ' / ' + item.steps.length + ' steps</span><span>' + pct + '%</span></div>';
          html += '<div style="background:#E2E8F0;border-radius:999px;height:6px;overflow:hidden;"><div style="background:#10B981;height:100%;border-radius:999px;width:' + pct + '%;transition:width 0.3s;"></div></div>';
          html += '</div>';
        }
        // Tags
        if (item.tags && item.tags.length > 0) {
          html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
          item.tags.forEach(function (tag) {
            html += '<span style="display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;background:#F1F5F9;color:#64748B;">' + escapeHtml(tag) + '</span>';
          });
          html += '</div>';
        }
        html += '</div></div>';
      });
      html += '</div>';
    }

    pageBody.innerHTML = html;

    // Search listener
    var searchInput = document.getElementById('kbSearch');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        searchQuery = this.value;
        renderList();
      });
    }
  }

  // ---- Render detail view ----
  function renderDetail(id) {
    var items = getItems();
    var item = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) { item = items[i]; break; }
    }
    if (!item) { currentView = 'list'; renderList(); return; }

    var progress = getProgress();
    var completedSteps = progress[item.id] || [];

    var html = '';

    // Back button
    html += '<div style="margin-bottom:20px;">';
    html += '<button class="btn btn-outline btn-sm" data-action="back-to-list" style="display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back to Knowledge Base</button>';
    html += '</div>';

    // Header card
    html += '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);border:1px solid #E2E8F0;padding:24px;margin-bottom:20px;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px;">';
    html += '<div>';
    html += '<h2 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#1E293B;">' + escapeHtml(item.title) + '</h2>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">';
    html += categoryBadge(item.category);
    html += typeBadge(item.type);
    if (item.type === 'training' && item.difficulty) {
      html += difficultyBadge(item.difficulty);
    }
    if (item.estimatedMinutes) {
      html += '<span style="font-size:13px;color:#64748B;">' + item.estimatedMinutes + ' min</span>';
    }
    html += '</div>';
    html += '</div>';
    // Actions
    if (Auth.isPrivileged()) {
      html += '<div style="display:flex;gap:8px;">';
      html += '<button class="btn btn-outline btn-sm" data-action="edit-resource" data-id="' + item.id + '">Edit</button>';
      html += '<button class="btn btn-outline btn-sm" style="color:#DC2626;border-color:#FECACA;" data-action="delete-resource" data-id="' + item.id + '">Delete</button>';
      html += '</div>';
    }
    html += '</div>';

    // Tags
    if (item.tags && item.tags.length > 0) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">';
      item.tags.forEach(function (tag) {
        html += '<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;background:#F1F5F9;color:#64748B;">' + escapeHtml(tag) + '</span>';
      });
      html += '</div>';
    }

    // Video embed (if item has a video URL)
    if (item.videoUrl) {
      html += getVideoEmbed(item.videoUrl);
    }

    // Content with rich rendering
    html += '<div style="line-height:1.7;color:#334155;font-size:14px;">' + renderContent(item.content) + '</div>';
    html += '</div>';

    // Training steps
    if (item.type === 'training' && item.steps && item.steps.length > 0) {
      var pct = item.steps.length > 0 ? Math.round((completedSteps.length / item.steps.length) * 100) : 0;

      html += '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);border:1px solid #E2E8F0;padding:24px;">';
      html += '<h3 style="margin:0 0 16px 0;font-size:18px;font-weight:700;color:#1E293B;">Training Steps</h3>';

      // Progress bar
      html += '<div style="margin-bottom:20px;">';
      html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:#64748B;margin-bottom:6px;"><span>' + completedSteps.length + ' of ' + item.steps.length + ' completed</span><span>' + pct + '%</span></div>';
      html += '<div style="background:#E2E8F0;border-radius:999px;height:8px;overflow:hidden;"><div style="background:#10B981;height:100%;border-radius:999px;width:' + pct + '%;transition:width 0.3s;"></div></div>';
      html += '</div>';

      // Steps list
      item.steps.forEach(function (step, idx) {
        var isCompleted = completedSteps.indexOf(idx) !== -1;
        var stepIcon = STEP_ICONS[step.type] || STEP_ICONS['Read'];
        var stepTypeColor = step.type === 'Quiz' ? '#7C3AED' : step.type === 'Watch' ? '#2563EB' : step.type === 'Do' ? '#059669' : '#475569';

        html += '<div style="display:flex;align-items:flex-start;gap:12px;padding:14px;border-radius:10px;border:1px solid ' + (isCompleted ? '#BBF7D0' : '#E2E8F0') + ';background:' + (isCompleted ? '#F0FDF4' : '#fff') + ';margin-bottom:10px;">';
        // Checkbox
        html += '<label style="display:flex;align-items:center;cursor:pointer;flex-shrink:0;margin-top:2px;">';
        html += '<input type="checkbox" ' + (isCompleted ? 'checked' : '') + ' data-action="toggle-step" data-item-id="' + item.id + '" data-step-idx="' + idx + '" style="width:18px;height:18px;cursor:pointer;accent-color:#10B981;">';
        html += '</label>';
        // Step content
        html += '<div style="flex:1;min-width:0;">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">';
        html += '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:' + stepTypeColor + '15;color:' + stepTypeColor + ';">' + stepIcon + ' ' + escapeHtml(step.type) + '</span>';
        html += '<span style="font-weight:600;font-size:14px;color:' + (isCompleted ? '#64748B' : '#1E293B') + ';' + (isCompleted ? 'text-decoration:line-through;' : '') + '">' + escapeHtml(step.title) + '</span>';
        html += '</div>';
        if (step.description) {
          html += '<div style="font-size:13px;color:#64748B;line-height:1.5;">' + renderContent(step.description) + '</div>';
        }
        if (step.videoUrl) {
          html += getVideoEmbed(step.videoUrl, '100%', '280');
        }
        html += '</div></div>';
      });

      html += '</div>';
    }

    // Created by / date
    html += '<div style="margin-top:16px;font-size:12px;color:#94A3B8;">Created by ' + escapeHtml(item.createdBy || 'Unknown') + ' on ' + Data.formatDate(item.createdAt) + '</div>';

    pageBody.innerHTML = html;
  }

  // ---- Render form view ----
  function renderForm(id) {
    var items = getItems();
    var item = null;
    if (id) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === id) { item = items[i]; break; }
      }
    }
    var isEdit = !!item;
    var v = item || { type: 'article', category: '', difficulty: 'beginner', tags: [], steps: [], pinned: false };

    var html = '';

    // Back button
    html += '<div style="margin-bottom:20px;">';
    html += '<button class="btn btn-outline btn-sm" data-action="back-to-list" style="display:inline-flex;align-items:center;gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg> Back</button>';
    html += '</div>';

    html += '<div style="background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);border:1px solid #E2E8F0;padding:24px;max-width:720px;">';
    html += '<h2 style="margin:0 0 20px 0;font-size:22px;font-weight:700;color:#1E293B;">' + (isEdit ? 'Edit Resource' : 'Add Resource') + '</h2>';

    // Title
    html += '<div class="form-group"><label>Title *</label><input type="text" id="kbTitle" class="form-control" value="' + escapeHtml(v.title || '') + '" placeholder="Resource title"></div>';

    // Row: Category + Type
    html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    var catOpts = CATEGORY_KEYS.map(function (cat) {
      var sel = v.category === cat ? ' selected' : '';
      return '<option value="' + escapeHtml(cat) + '"' + sel + '>' + escapeHtml(cat) + '</option>';
    }).join('');
    html += '<div class="form-group"><label>Category *</label><select id="kbCategory" class="form-control"><option value="">Select category</option>' + catOpts + '</select></div>';
    html += '<div class="form-group"><label>Type *</label><select id="kbType" class="form-control"><option value="article"' + (v.type === 'article' ? ' selected' : '') + '>Article</option><option value="training"' + (v.type === 'training' ? ' selected' : '') + '>Training</option></select></div>';
    html += '</div>';

    // Row: Difficulty + Estimated Time (shown for training)
    html += '<div id="trainingFields" style="' + (v.type === 'training' ? '' : 'display:none;') + '">';
    html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    html += '<div class="form-group"><label>Difficulty</label><select id="kbDifficulty" class="form-control"><option value="beginner"' + (v.difficulty === 'beginner' ? ' selected' : '') + '>Beginner</option><option value="intermediate"' + (v.difficulty === 'intermediate' ? ' selected' : '') + '>Intermediate</option><option value="advanced"' + (v.difficulty === 'advanced' ? ' selected' : '') + '>Advanced</option></select></div>';
    html += '<div class="form-group"><label>Estimated Minutes</label><input type="number" id="kbMinutes" class="form-control" value="' + (v.estimatedMinutes || '') + '" placeholder="e.g. 30"></div>';
    html += '</div>';
    html += '</div>';

    // Video URL
    html += '<div class="form-group"><label>Video URL (optional)</label><input type="text" id="kbVideoUrl" class="form-control" value="' + escapeHtml(v.videoUrl || '') + '" placeholder="YouTube, Vimeo, or Loom URL"></div>';
    html += '<div style="font-size:.72rem;color:#94A3B8;margin:-8px 0 12px">Supports YouTube, Vimeo, Loom, and Google Drive video links. Video will display at the top of the article.</div>';

    // Content
    html += '<div class="form-group"><label>Content *</label><textarea id="kbContent" class="form-control" rows="12" placeholder="Write your content here...\n\nFormatting tips:\n# Heading 1\n## Heading 2\n### Heading 3\n**bold text**\n*italic text*\n- bullet point\n1. numbered list\n> callout block\n[link text](url)\n[video](youtube-url)\n--- horizontal line">' + escapeHtml(v.content || '') + '</textarea></div>';
    html += '<div style="font-size:.72rem;color:#94A3B8;margin:-8px 0 12px">Use # for headers, **bold**, *italic*, - for bullets, > for callouts, [video](url) to embed videos inline</div>';

    // Tags
    html += '<div class="form-group"><label>Tags (comma-separated)</label><input type="text" id="kbTags" class="form-control" value="' + escapeHtml((v.tags || []).join(', ')) + '" placeholder="e.g. buyer, scripts, onboarding"></div>';

    // Pinned toggle
    html += '<div class="form-group" style="display:flex;align-items:center;gap:10px;">';
    html += '<label style="margin:0;cursor:pointer;display:flex;align-items:center;gap:8px;"><input type="checkbox" id="kbPinned" ' + (v.pinned ? 'checked' : '') + ' style="width:18px;height:18px;cursor:pointer;"> Pin this resource</label>';
    html += '</div>';

    // Training steps section
    html += '<div id="stepsSection" style="' + (v.type === 'training' ? '' : 'display:none;') + 'margin-top:20px;padding-top:20px;border-top:1px solid #E2E8F0;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">';
    html += '<h3 style="margin:0;font-size:16px;font-weight:700;">Training Steps</h3>';
    html += '<button class="btn btn-outline btn-sm" data-action="add-step" type="button">+ Add Step</button>';
    html += '</div>';
    html += '<div id="stepsList">';
    if (v.steps && v.steps.length > 0) {
      v.steps.forEach(function (step, idx) {
        html += stepRowHtml(idx, step);
      });
    }
    html += '</div>';
    html += '</div>';

    // Save button
    html += '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">';
    html += '<button class="btn btn-outline" data-action="back-to-list">Cancel</button>';
    html += '<button class="btn btn-primary" data-action="save-resource" data-id="' + (v.id || '') + '">' + (isEdit ? 'Update' : 'Add Resource') + '</button>';
    html += '</div>';

    html += '</div>';

    pageBody.innerHTML = html;

    // Toggle training fields on type change
    var typeSelect = document.getElementById('kbType');
    if (typeSelect) {
      typeSelect.addEventListener('change', function () {
        var isTraining = this.value === 'training';
        document.getElementById('trainingFields').style.display = isTraining ? '' : 'none';
        document.getElementById('stepsSection').style.display = isTraining ? '' : 'none';
      });
    }
  }

  function stepRowHtml(idx, step) {
    step = step || { title: '', type: 'Read', description: '' };
    var typeOpts = STEP_TYPES.map(function (t) {
      return '<option value="' + t + '"' + (step.type === t ? ' selected' : '') + '>' + t + '</option>';
    }).join('');

    var html = '<div class="step-row" data-step-idx="' + idx + '" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px;margin-bottom:10px;">';
    html += '<div class="form-row" style="display:grid;grid-template-columns:1fr 120px auto;gap:10px;align-items:start;">';
    html += '<div class="form-group" style="margin:0;"><input type="text" class="form-control step-title" value="' + escapeHtml(step.title) + '" placeholder="Step title"></div>';
    html += '<div class="form-group" style="margin:0;"><select class="form-control step-type">' + typeOpts + '</select></div>';
    html += '<button class="btn btn-outline btn-sm" data-action="remove-step" data-step-idx="' + idx + '" style="color:#DC2626;border-color:#FECACA;padding:6px 10px;" type="button">&times;</button>';
    html += '</div>';
    html += '<div class="form-group" style="margin:8px 0 0 0;"><textarea class="form-control step-desc" rows="2" placeholder="Step description (supports formatting)...">' + escapeHtml(step.description || '') + '</textarea></div>';
    html += '<div class="form-group" style="margin:6px 0 0 0;"><input type="text" class="form-control step-video" value="' + escapeHtml(step.videoUrl || '') + '" placeholder="Video URL for this step (optional)"></div>';
    html += '</div>';
    return html;
  }

  var stepCounter = 0;

  function addStepRow() {
    var stepsList = document.getElementById('stepsList');
    if (!stepsList) return;
    var idx = stepsList.children.length;
    var div = document.createElement('div');
    div.innerHTML = stepRowHtml(idx, null);
    stepsList.appendChild(div.firstChild);
  }

  function removeStepRow(idx) {
    var stepsList = document.getElementById('stepsList');
    if (!stepsList) return;
    var rows = stepsList.querySelectorAll('.step-row');
    if (rows[idx]) {
      stepsList.removeChild(rows[idx]);
    }
    // Re-index
    var remaining = stepsList.querySelectorAll('.step-row');
    for (var i = 0; i < remaining.length; i++) {
      remaining[i].setAttribute('data-step-idx', i);
      var removeBtn = remaining[i].querySelector('[data-action="remove-step"]');
      if (removeBtn) removeBtn.setAttribute('data-step-idx', i);
    }
  }

  function collectSteps() {
    var stepsList = document.getElementById('stepsList');
    if (!stepsList) return [];
    var rows = stepsList.querySelectorAll('.step-row');
    var steps = [];
    for (var i = 0; i < rows.length; i++) {
      var titleInput = rows[i].querySelector('.step-title');
      var typeSelect = rows[i].querySelector('.step-type');
      var descInput = rows[i].querySelector('.step-desc');
      var videoInput = rows[i].querySelector('.step-video');
      if (titleInput && titleInput.value.trim()) {
        steps.push({
          title: titleInput.value.trim(),
          type: typeSelect ? typeSelect.value : 'Read',
          description: descInput ? descInput.value.trim() : '',
          videoUrl: videoInput ? videoInput.value.trim() : ''
        });
      }
    }
    return steps;
  }

  // ---- Save resource ----
  function saveResource(id) {
    var title = document.getElementById('kbTitle').value.trim();
    var category = document.getElementById('kbCategory').value;
    var type = document.getElementById('kbType').value;
    var content = document.getElementById('kbContent').value.trim();
    var tagsRaw = document.getElementById('kbTags').value.trim();
    var pinned = document.getElementById('kbPinned').checked;

    if (!title) { showToast('Title is required.', 'error'); return; }
    if (!category) { showToast('Please select a category.', 'error'); return; }
    if (!content) { showToast('Content is required.', 'error'); return; }

    var tags = tagsRaw ? tagsRaw.split(',').map(function (t) { return t.trim(); }).filter(function (t) { return t; }) : [];
    var videoUrl = document.getElementById('kbVideoUrl').value.trim();

    var difficulty = null;
    var estimatedMinutes = null;
    var steps = [];
    if (type === 'training') {
      difficulty = document.getElementById('kbDifficulty').value;
      var minVal = document.getElementById('kbMinutes').value;
      estimatedMinutes = minVal ? parseInt(minVal, 10) : null;
      steps = collectSteps();
    }

    var session = Auth.getSession();
    var items = getItems();

    if (id) {
      items = items.map(function (item) {
        if (item.id === id) {
          item.title = title;
          item.category = category;
          item.type = type;
          item.content = content;
          item.tags = tags;
          item.pinned = pinned;
          item.videoUrl = videoUrl;
          item.difficulty = difficulty;
          item.estimatedMinutes = estimatedMinutes;
          item.steps = steps;
        }
        return item;
      });
      showToast('Resource updated successfully.');
    } else {
      items.push({
        id: generateId(),
        title: title,
        category: category,
        type: type,
        content: content,
        tags: tags,
        pinned: pinned,
        videoUrl: videoUrl,
        difficulty: difficulty,
        estimatedMinutes: estimatedMinutes,
        steps: steps,
        createdBy: session ? session.displayName : 'Unknown',
        createdAt: new Date().toISOString()
      });
      showToast('Resource added successfully.');
    }

    saveItems(items);
    currentView = 'list';
    renderList();
  }

  // ---- Delete resource ----
  function deleteResource(id) {
    if (!confirm('Delete this resource?')) return;
    var items = getItems().filter(function (i) { return i.id !== id; });
    saveItems(items);
    showToast('Resource deleted.');
    currentView = 'list';
    renderList();
  }

  // ---- Toggle training step ----
  function toggleStep(itemId, stepIdx) {
    var progress = getProgress();
    var completed = progress[itemId] || [];
    stepIdx = parseInt(stepIdx, 10);

    var pos = completed.indexOf(stepIdx);
    if (pos === -1) {
      completed.push(stepIdx);
    } else {
      completed.splice(pos, 1);
    }

    progress[itemId] = completed;
    saveProgress(progress);

    // Check if all steps completed
    var items = getItems();
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === itemId && items[i].steps) {
        if (completed.length === items[i].steps.length) {
          showToast('Training completed! Great job!');
        }
        break;
      }
    }

    renderDetail(itemId);
  }

  // ---- Event delegation ----
  document.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (!target) return;
    var action = target.getAttribute('data-action');

    if (action === 'filter') {
      currentFilter = target.getAttribute('data-filter');
      renderList();
    } else if (action === 'view-item') {
      viewingId = target.getAttribute('data-id');
      currentView = 'detail';
      renderDetail(viewingId);
    } else if (action === 'back-to-list') {
      currentView = 'list';
      editingId = null;
      viewingId = null;
      renderList();
    } else if (action === 'add-resource') {
      editingId = null;
      currentView = 'form';
      renderForm(null);
    } else if (action === 'edit-resource') {
      editingId = target.getAttribute('data-id');
      currentView = 'form';
      renderForm(editingId);
    } else if (action === 'delete-resource') {
      deleteResource(target.getAttribute('data-id'));
    } else if (action === 'save-resource') {
      saveResource(target.getAttribute('data-id'));
    } else if (action === 'add-step') {
      addStepRow();
    } else if (action === 'remove-step') {
      removeStepRow(parseInt(target.getAttribute('data-step-idx'), 10));
    }
  });

  // Handle checkbox changes for training steps
  document.addEventListener('change', function (e) {
    var target = e.target.closest('[data-action="toggle-step"]');
    if (target) {
      var itemId = target.getAttribute('data-item-id');
      var stepIdx = target.getAttribute('data-step-idx');
      toggleStep(itemId, stepIdx);
      return;
    }

    // Handle "mark as read" checkboxes
    var readTarget = e.target.closest('[data-action="toggle-read"]');
    if (readTarget) {
      var articleId = readTarget.getAttribute('data-item-id');
      var readKey = 'reb_kb_read';
      var readItems = {};
      try { readItems = JSON.parse(localStorage.getItem(readKey) || '{}'); } catch(ex) {}
      var username = session ? session.username : '';
      if (!readItems[username]) readItems[username] = {};
      readItems[username][articleId] = readTarget.checked;
      localStorage.setItem(readKey, JSON.stringify(readItems));
      renderList();
      return;
    }
  });

  // ---- Init ----
  renderList();

})();
