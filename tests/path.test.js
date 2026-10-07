import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPathExploration, classifyProspectStep, prospectEventTrail, PATH_PRESETS, PATH_DIMENSIONS,
} from '../supabase/functions/_shared/core/index.js';
import { buildDemoData } from '../app/demo.js';

test('empty prospect list produces valid empty path exploration without NaN', () => {
  const res = buildPathExploration([], [], []);
  assert.equal(res.total, 0);
  assert.equal(res.activeCount, 0);
  assert.equal(res.columns.length, 4);
  assert.equal(res.links.length, 0);
  assert.equal(res.matchedProspects.length, 0);
  assert.ok(Number.isFinite(res.svgWidth) && res.svgWidth > 0);
  assert.ok(Number.isFinite(res.svgHeight) && res.svgHeight > 0);
});

test('single prospect flows cleanly across all columns', () => {
  const p = { id: 'p1', agency_name: 'Bellagio Studio', status: 't1_sent', segment: 'boutique_local', type: 'planner', language: 'it', location: 'Bellagio' };
  const t = [{ id: 't1', prospect_id: 'p1', direction: 'out', state: 'sent', step_name: 'T1_intro', channel: 'email', sent_at: '2026-10-06T08:00:00Z', variant: 'A' }];
  const res = buildPathExploration([p], t, []);
  assert.equal(res.total, 1);
  assert.equal(res.activeCount, 1);
  for (const col of res.columns) {
    assert.equal(col.total, 1);
    assert.equal(col.nodes.length, 1);
    assert.equal(col.nodes[0].count, 1);
    assert.ok(col.nodes[0].barHeight >= 4);
  }
  assert.equal(res.links.length, 3);
  for (const l of res.links) {
    assert.equal(l.count, 1);
    assert.match(l.d, /^M\d+/);
    assert.ok(!l.d.includes('NaN'));
  }
});

test('demo dataset conserves flow counts across columns and links', () => {
  const demo = buildDemoData();
  for (const preset of PATH_PRESETS) {
    const res = buildPathExploration(demo.prospects, demo.touches, demo.opps, { steps: preset.steps, maxNodesPerCol: 6 });
    assert.equal(res.total, demo.prospects.length);
    assert.equal(res.activeCount, demo.prospects.length);
    for (let c = 0; c < res.columns.length; c++) {
      const col = res.columns[c];
      const sumNodes = col.nodes.reduce((s, n) => s + n.count, 0);
      assert.equal(sumNodes, demo.prospects.length, `column ${c} (${preset.key}) node sum matches total`);
      if (c < res.columns.length - 1) {
        const colLinks = res.links.filter((l) => l.col === c);
        const sumLinks = colLinks.reduce((s, l) => s + l.count, 0);
        assert.equal(sumLinks, demo.prospects.length, `column ${c}->${c + 1} (${preset.key}) link sum matches total`);
      }
    }
  }
});

test('+N More bucket groups tail nodes and expands when requested', () => {
  const demo = buildDemoData();
  const collapsed = buildPathExploration(demo.prospects, demo.touches, demo.opps, {
    steps: ['entry', 'cadence_step', 'response', 'stage'],
    maxNodesPerCol: 5,
  });
  const stageCol = collapsed.columns[3];
  assert.equal(stageCol.nodes.length, 5);
  const moreNode = stageCol.nodes.find((n) => n.isMore);
  assert.ok(moreNode, '+N More node exists');
  assert.equal(moreNode.isMore, true);
  assert.match(moreNode.label, /^\+\d+ More$/);
  assert.ok(moreNode.hiddenCount >= 4);
  // Ensure +N More for band 1 sits above Ready/Researching (bands 2 & 3) so ribbons do not cross
  const moreIdx = stageCol.nodes.indexOf(moreNode);
  const readyIdx = stageCol.nodes.findIndex((n) => n.key === 'stage:ready');
  if (readyIdx >= 0) assert.ok(moreIdx < readyIdx, '+N More for contacted stages sits above Ready to Contact');


  // Expanding column 3 reveals all stages without a +N More node
  const expanded = buildPathExploration(demo.prospects, demo.touches, demo.opps, {
    steps: ['entry', 'cadence_step', 'response', 'stage'],
    maxNodesPerCol: 5,
    expandedCols: [3],
  });
  const expCol = expanded.columns[3];
  assert.ok(expCol.nodes.length > 5);
  assert.equal(expCol.nodes.some((n) => n.isMore), false);
  assert.equal(expCol.canCollapse, true);
});

test('selecting a node branches downstream columns and highlights upstream paths', () => {
  const demo = buildDemoData();
  const res = buildPathExploration(demo.prospects, demo.touches, demo.opps, {
    steps: ['entry', 'cadence_step', 'response', 'stage'],
    selectedPath: { 2: 'resp:positive' },
  });
  // Column 2 keeps all sibling nodes for comparison, with resp:positive marked selected
  const posNode = res.columns[2].nodes.find((n) => n.key === 'resp:positive');
  assert.ok(posNode);
  assert.equal(posNode.selected, true);

  // Column 3 branches exclusively from resp:positive
  assert.equal(res.columns[3].total, posNode.count);
  assert.equal(res.activeCount, posNode.count);
  assert.equal(res.matchedProspects.length, posNode.count);
  assert.equal(res.breadcrumbs.length, 1);
  assert.equal(res.breadcrumbs[0].key, 'resp:positive');

  // Links from col 2 -> col 3 only originate from resp:positive
  const links2to3 = res.links.filter((l) => l.col === 2);
  assert.ok(links2to3.length > 0);
  assert.ok(links2to3.every((l) => l.sourceKey === 'resp:positive'));
  assert.equal(links2to3.reduce((s, l) => s + l.count, 0), posNode.count);
});

test('all PATH_DIMENSIONS classify prospects without errors', () => {
  const demo = buildDemoData();
  const p = demo.prospects[0];
  const pTouches = demo.touches.filter((t) => t.prospect_id === p.id);
  const pOpps = demo.opps.filter((o) => o.prospect_id === p.id);
  const trail = prospectEventTrail(p, pTouches, pOpps);
  for (const dim of PATH_DIMENSIONS) {
    const cell = classifyProspectStep(p, dim.key, { touches: pTouches, opps: pOpps, trail });
    assert.ok(cell.key && cell.label, `dim ${dim.key} returned valid cell`);
  }
});

test('multi-step chained selection and invalid selection recovery', () => {
  const demo = buildDemoData();
  const chained = buildPathExploration(demo.prospects, demo.touches, demo.opps, {
    steps: ['entry', 'cadence_step', 'response', 'stage'],
    selectedPath: { 0: 'entry:contacted', 1: 'step:t1' },
  });
  assert.equal(chained.breadcrumbs.length, 2);
  assert.equal(chained.columns[1].total, 58);
  const t1Node = chained.columns[1].nodes.find((n) => n.key === 'step:t1');
  assert.ok(t1Node);
  assert.equal(chained.columns[2].total, t1Node.count);
  assert.equal(chained.activeCount, t1Node.count);

  // Invalid node keys in selectedPath are safely ignored without zeroing out the view
  const recovered = buildPathExploration(demo.prospects, demo.touches, demo.opps, {
    steps: ['entry', 'cadence_step', 'response'],
    selectedPath: { 0: 'nonexistent:key' },
  });
  assert.equal(recovered.breadcrumbs.length, 0);
  assert.equal(recovered.activeCount, demo.prospects.length);
  assert.equal(recovered.columns.length, 3);
});

test('stage mutations on prospects with historical touches immediately update entry, cadence_step, and response nodes', () => {
  const touches = [
    { id: 't1', prospect_id: 'p1', direction: 'out', state: 'sent', step_name: 'T1_intro', channel: 'email', sent_at: '2026-09-01T09:00:00Z' },
    { id: 't3', prospect_id: 'p1', direction: 'out', state: 'sent', step_name: 'T3_followup', channel: 'email', sent_at: '2026-09-09T09:00:00Z' },
    { id: 't4', prospect_id: 'p1', direction: 'out', state: 'sent', step_name: 'T4_breakup', channel: 'email', sent_at: '2026-09-15T09:00:00Z' },
  ];
  const base = { id: 'p1', agency_name: 'Villa Events', email: 'info@villa.it', personalization_hook: 'Loved your Villa Balbiano wedding', status: 't4_sent' };

  // Moved to ready
  const asReady = { ...base, status: 'ready' };
  assert.equal(classifyProspectStep(asReady, 'entry', { touches }).key, 'entry:ready');
  assert.equal(classifyProspectStep(asReady, 'cadence_step', { touches }).key, 'step:ready');
  assert.equal(classifyProspectStep(asReady, 'response', { touches }).key, 'resp:queued');

  // Moved to researching
  const asResearching = { ...base, status: 'researching' };
  assert.equal(classifyProspectStep(asResearching, 'entry', { touches }).key, 'entry:researching');
  assert.equal(classifyProspectStep(asResearching, 'cadence_step', { touches }).key, 'step:ready_check');
  assert.equal(classifyProspectStep(asResearching, 'response', { touches }).key, 'resp:pre_outreach');

  // Moved to t1_sent
  const asT1 = { ...base, status: 't1_sent' };
  assert.equal(classifyProspectStep(asT1, 'entry', { touches }).key, 'entry:contacted');
  assert.equal(classifyProspectStep(asT1, 'cadence_step', { touches }).key, 'step:t1');
  assert.equal(classifyProspectStep(asT1, 'response', { touches }).key, 'resp:waiting');

  // Moved to replied (without inbound touch row)
  const asReplied = { ...base, status: 'replied' };
  assert.equal(classifyProspectStep(asReplied, 'response', { touches }).key, 'resp:positive');

  // Moved to nurture and do_not_contact
  assert.equal(classifyProspectStep({ ...base, status: 'nurture' }, 'response', { touches }).key, 'resp:nurture');
  assert.equal(classifyProspectStep({ ...base, status: 'do_not_contact' }, 'response', { touches }).key, 'resp:unsub');
});

test('event sequence preset never creates duplicate node labels in a column and formats draft labels cleanly', () => {
  const demo = buildDemoData();
  const res = buildPathExploration(demo.prospects, demo.touches, demo.opps, {
    steps: ['touch_1', 'touch_2', 'touch_3', 'touch_4'],
    expandedCols: [0, 1, 2, 3],
  });
  for (const col of res.columns) {
    const labels = col.nodes.map((n) => n.label);
    const uniqueLabels = new Set(labels);
    assert.equal(labels.length, uniqueLabels.size, `Column ${col.index} (${col.label}) has no duplicate node labels: ${labels.join(', ')}`);
    for (const label of labels) {
      assert.doesNotMatch(label, /^(rate|reply|fam) (Drafted|Scheduled)$/, `Cleanly capitalized draft label: ${label}`);
    }
  }
});

test('+N More bucket never merges band 2 (Ready) or band 3 (Researching) into band 1 across presets', () => {
  const demo = buildDemoData();
  for (const preset of PATH_PRESETS) {
    const res = buildPathExploration(demo.prospects, demo.touches, demo.opps, {
      steps: preset.steps,
      maxNodesPerCol: 6,
    });
    for (const col of res.columns) {
      for (let i = 1; i < col.nodes.length; i++) {
        assert.ok(col.nodes[i].band >= col.nodes[i - 1].band, `Column ${col.index} (${preset.key}) bands are monotonic`);
      }
      // Verify no link crosses from band 3 up to band 1 over band 2
      const colLinks = res.links.filter((l) => l.col === col.index);
      const nodeMapA = new Map(col.nodes.map((n) => [n.key, n]));
      const nextCol = res.columns[col.index + 1];
      if (!nextCol) continue;
      const nodeMapB = new Map(nextCol.nodes.map((n) => [n.key, n]));
      for (const l of colLinks) {
        const srcBand = nodeMapA.get(l.sourceKey)?.band;
        const dstBand = nodeMapB.get(l.targetKey)?.band;
        if (srcBand === 3) {
          assert.equal(dstBand, 3, `Band 3 node in ${preset.key} col ${col.index} stays in band 3`);
        }
      }
    }
  }
});


