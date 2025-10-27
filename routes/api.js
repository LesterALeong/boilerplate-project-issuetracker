// routes/api.js
'use strict';

const crypto = require('crypto');

// project => [issues...]
const store = new Map();
const getIssues = (project) => {
  if (!store.has(project)) store.set(project, []);
  return store.get(project);
};

const makeId = () => crypto.randomBytes(12).toString('hex');

module.exports = function (app) {
  app.route('/api/issues/:project')

    // GET: list issues, with optional filters (?open=false&created_by=You)
    .get((req, res) => {
      const project = req.params.project;
      const issues = getIssues(project);

      const allowed = [
        '_id','issue_title','issue_text','created_by',
        'assigned_to','status_text','open','created_on','updated_on'
      ];

      const filtered = issues.filter((doc) => {
        for (const [k, v] of Object.entries(req.query)) {
          if (!allowed.includes(k)) continue;
          if (k === 'open') {
            const want = v === 'true' || v === true;
            if (doc.open !== want) return false;
          } else {
            // compare as strings for simplicity (dates stringify nicely)
            if (String(doc[k]) !== String(v)) return false;
          }
        }
        return true;
      });

      return res.json(filtered);
    })

    // POST: create issue
    .post((req, res) => {
      const project = req.params.project;
      const {
        issue_title,
        issue_text,
        created_by,
        assigned_to = '',
        status_text = ''
      } = req.body || {};

      if (!issue_title || !issue_text || !created_by) {
        return res.json({ error: 'required field(s) missing' });
      }

      const now = new Date();
      const doc = {
        _id: makeId(),
        issue_title,
        issue_text,
        created_by,
        assigned_to,
        status_text,
        created_on: now,
        updated_on: now,
        open: true
      };

      getIssues(project).push(doc);
      return res.json(doc);
    })

    // PUT: update issue
    .put((req, res) => {
      const { _id, ...rest } = req.body || {};
      if (!_id) return res.json({ error: 'missing _id' });

      // find across the project in the route
      const project = req.params.project;
      const issues = getIssues(project);
      const idx = issues.findIndex((i) => String(i._id) === String(_id));
      if (idx === -1) return res.json({ error: 'could not update', _id });

      const updatable = [
        'issue_title','issue_text','created_by','assigned_to','status_text','open'
      ];
      const updateDoc = {};
      for (const k of updatable) {
        if (rest[k] !== undefined && rest[k] !== '') {
          if (k === 'open') {
            updateDoc.open = (rest[k] === true || rest[k] === 'true')
              ? true
              : (rest[k] === false || rest[k] === 'false')
              ? false
              : rest[k];
          } else {
            updateDoc[k] = rest[k];
          }
        }
      }

      if (Object.keys(updateDoc).length === 0) {
        return res.json({ error: 'no update field(s) sent', _id });
      }

      issues[idx] = { ...issues[idx], ...updateDoc, updated_on: new Date() };
      return res.json({ result: 'successfully updated', _id });
    })

    // DELETE: remove issue by _id
    .delete((req, res) => {
      const { _id } = req.body || {};
      if (!_id) return res.json({ error: 'missing _id' });

      const project = req.params.project;
      const issues = getIssues(project);
      const before = issues.length;
      const after = issues.filter((i) => String(i._id) !== String(_id));
      if (after.length === before) {
        return res.json({ error: 'could not delete', _id });
      }
      store.set(project, after);
      return res.json({ result: 'successfully deleted', _id });
    });
};
