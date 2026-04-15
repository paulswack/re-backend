const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

// GET /api/transactions — all transactions for team
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, agent_id } = req.query;
    let query = getSupabase()
      .from('transactions')
      .select('*, transaction_parties(*)')
      .eq('team_id', req.user.teamId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (agent_id) query = query.eq('agent_id', agent_id);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/transactions/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('transactions')
      .select('*, transaction_parties(*)')
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Transaction not found' });

    // Non-privileged users can only view their own deals
    const role = req.user.role;
    if (role !== 'Team Lead' && role !== 'Admin') {
      let isOwner = false;
      if (data.agent_id) {
        isOwner = data.agent_id === req.user.userId;
      } else if (data.agent_name) {
        // Fallback: match by name for deals without agent_id
        const { data: me } = await getSupabase().from('users').select('display_name').eq('id', req.user.userId).single();
        isOwner = me && me.display_name && me.display_name.toLowerCase() === data.agent_name.toLowerCase();
      } else {
        isOwner = true; // No agent assigned — allow access
      }
      if (!isOwner) {
        return res.status(403).json({ error: 'You can only view your own deals' });
      }
    }

    res.json(data);
  } catch (err) {
    console.error('GET transaction error:', err);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

// POST /api/transactions
router.post('/', requireAuth, async (req, res) => {
  try {
    const { parties, ...fields } = req.body;
    fields.team_id = req.user.teamId;

    const { data, error } = await getSupabase()
      .from('transactions')
      .insert(fields)
      .select()
      .single();

    if (error) throw error;

    // Insert parties if provided
    if (parties && parties.length > 0) {
      const partyRows = parties.map(p => ({ ...p, transaction_id: data.id }));
      await getSupabase().from('transaction_parties').insert(partyRows);
    }

    res.status(201).json(data);
  } catch (err) {
    console.error('POST transaction error:', err);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PUT /api/transactions/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { parties, ...fields } = req.body;
    delete fields.id;
    delete fields.team_id;

    let data;
    // Only run the transaction update if there are actual fields to change
    if (Object.keys(fields).length > 0) {
      const result = await getSupabase()
        .from('transactions')
        .update(fields)
        .eq('id', req.params.id)
        .eq('team_id', req.user.teamId)
        .select()
        .single();
      if (result.error) throw result.error;
      data = result.data;
    } else {
      // parties-only update — fetch the transaction to return it
      const result = await getSupabase()
        .from('transactions')
        .select('*')
        .eq('id', req.params.id)
        .eq('team_id', req.user.teamId)
        .single();
      if (result.error) throw result.error;
      data = result.data;
    }

    // Replace parties if provided
    if (parties) {
      // Deduplicate by type+name+phone+email before inserting
      const seen = new Set();
      const dedupedParties = parties.filter(p => {
        const key = `${p.party_type}|${(p.name||'').trim().toLowerCase()}|${(p.phone||'').trim()}|${(p.email||'').trim()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      await getSupabase().from('transaction_parties').delete().eq('transaction_id', req.params.id);
      if (dedupedParties.length > 0) {
        const partyRows = dedupedParties.map(p => ({ ...p, transaction_id: req.params.id }));
        await getSupabase().from('transaction_parties').insert(partyRows);
      }
    }

    res.json(data);
  } catch (err) {
    console.error('PUT transaction error:', err);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await getSupabase()
      .from('transactions')
      .delete()
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE transaction error:', err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

module.exports = router;
