const express = require('express');
const { getSupabase } = require('../lib/supabase');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

// ==========================================
// CHECKLIST TEMPLATES
// ==========================================

// GET /api/checklists/templates
router.get('/templates', requireAuth, async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('checklist_templates')
      .select('*, checklist_template_items(*)')
      .eq('team_id', req.user.teamId)
      .order('sort_order');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('GET templates error:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// POST /api/checklists/templates
router.post('/templates', requireAuth, async (req, res) => {
  try {
    const { items, ...fields } = req.body;
    fields.team_id = req.user.teamId;

    const { data, error } = await getSupabase()
      .from('checklist_templates')
      .insert(fields)
      .select()
      .single();

    if (error) throw error;

    if (items && items.length > 0) {
      const itemRows = items.map((item, i) => ({
        template_id: data.id,
        label: typeof item === 'string' ? item : item.label,
        sort_order: typeof item === 'string' ? i : (item.sort_order ?? i)
      }));
      await getSupabase().from('checklist_template_items').insert(itemRows);
    }

    // Return with items
    const { data: full } = await getSupabase()
      .from('checklist_templates')
      .select('*, checklist_template_items(*)')
      .eq('id', data.id)
      .single();

    res.status(201).json(full);
  } catch (err) {
    console.error('POST template error:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT /api/checklists/templates/:id
router.put('/templates/:id', requireAuth, async (req, res) => {
  try {
    const { items, ...fields } = req.body;
    delete fields.id;
    delete fields.team_id;

    const { error } = await getSupabase()
      .from('checklist_templates')
      .update(fields)
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId);

    if (error) throw error;

    // Replace items if provided
    if (items) {
      await getSupabase().from('checklist_template_items').delete().eq('template_id', req.params.id);
      if (items.length > 0) {
        const itemRows = items.map((item, i) => ({
          template_id: req.params.id,
          label: typeof item === 'string' ? item : item.label,
          sort_order: typeof item === 'string' ? i : (item.sort_order ?? i)
        }));
        await getSupabase().from('checklist_template_items').insert(itemRows);
      }
    }

    const { data: full } = await getSupabase()
      .from('checklist_templates')
      .select('*, checklist_template_items(*)')
      .eq('id', req.params.id)
      .single();

    res.json(full);
  } catch (err) {
    console.error('PUT template error:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE /api/checklists/templates/:id
router.delete('/templates/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await getSupabase()
      .from('checklist_templates')
      .delete()
      .eq('id', req.params.id)
      .eq('team_id', req.user.teamId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE template error:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ==========================================
// DEAL CHECKLISTS
// ==========================================

// GET /api/checklists/deal/:entityType/:entityId
router.get('/deal/:entityType/:entityId', requireAuth, async (req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from('checklists')
      .select('*, checklist_items(*)')
      .eq('team_id', req.user.teamId)
      .eq('entity_type', req.params.entityType)
      .eq('entity_id', req.params.entityId)
      .order('created_at');

    if (error) throw error;

    // Sort items within each checklist
    for (const cl of data) {
      if (cl.checklist_items) {
        cl.checklist_items.sort((a, b) => a.sort_order - b.sort_order);
      }
    }

    res.json(data);
  } catch (err) {
    console.error('GET deal checklists error:', err);
    res.status(500).json({ error: 'Failed to fetch checklists' });
  }
});

// POST /api/checklists/deal — attach a template to a deal
router.post('/deal', requireAuth, async (req, res) => {
  try {
    const { entity_type, entity_id, template_id } = req.body;

    // Get template with items
    const { data: template } = await getSupabase()
      .from('checklist_templates')
      .select('*, checklist_template_items(*)')
      .eq('id', template_id)
      .eq('team_id', req.user.teamId)
      .single();

    if (!template) return res.status(404).json({ error: 'Template not found' });

    // Create checklist
    const { data: checklist, error } = await getSupabase()
      .from('checklists')
      .insert({
        team_id: req.user.teamId,
        entity_type,
        entity_id,
        template_name: template.name
      })
      .select()
      .single();

    if (error) throw error;

    // Create items from template
    if (template.checklist_template_items && template.checklist_template_items.length > 0) {
      const items = template.checklist_template_items
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((ti, i) => ({
          checklist_id: checklist.id,
          label: ti.label,
          sort_order: ti.sort_order ?? i
        }));
      await getSupabase().from('checklist_items').insert(items);
    }

    // Return full checklist
    const { data: full } = await getSupabase()
      .from('checklists')
      .select('*, checklist_items(*)')
      .eq('id', checklist.id)
      .single();

    res.status(201).json(full);
  } catch (err) {
    console.error('POST deal checklist error:', err);
    res.status(500).json({ error: 'Failed to attach checklist' });
  }
});

// PUT /api/checklists/items/:id/toggle — toggle item completion
router.put('/items/:id/toggle', requireAuth, async (req, res) => {
  try {
    // Get current state
    const { data: item } = await getSupabase()
      .from('checklist_items')
      .select('*, checklists!inner(team_id)')
      .eq('id', req.params.id)
      .single();

    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.checklists.team_id !== req.user.teamId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const nowCompleted = !item.completed;
    const { data, error } = await getSupabase()
      .from('checklist_items')
      .update({
        completed: nowCompleted,
        completed_by: nowCompleted ? req.user.displayName : null,
        completed_at: nowCompleted ? new Date().toISOString() : null
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('PUT toggle item error:', err);
    res.status(500).json({ error: 'Failed to toggle item' });
  }
});

// POST /api/checklists/:checklistId/items — add item to checklist
router.post('/:checklistId/items', requireAuth, async (req, res) => {
  try {
    // Verify ownership
    const { data: checklist } = await getSupabase()
      .from('checklists')
      .select('id')
      .eq('id', req.params.checklistId)
      .eq('team_id', req.user.teamId)
      .single();

    if (!checklist) return res.status(404).json({ error: 'Checklist not found' });

    const { label, sort_order } = req.body;
    const { data, error } = await getSupabase()
      .from('checklist_items')
      .insert({
        checklist_id: req.params.checklistId,
        label,
        sort_order: sort_order ?? 999
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('POST checklist item error:', err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// DELETE /api/checklists/items/:id
router.delete('/items/:id', requireAuth, async (req, res) => {
  try {
    // Verify ownership via join
    const { data: item } = await getSupabase()
      .from('checklist_items')
      .select('*, checklists!inner(team_id)')
      .eq('id', req.params.id)
      .single();

    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.checklists.team_id !== req.user.teamId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { error } = await getSupabase()
      .from('checklist_items')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE checklist item error:', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
