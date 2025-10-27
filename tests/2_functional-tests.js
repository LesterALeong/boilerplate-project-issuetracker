// tests/2_functional-tests.js
const chai = require('chai');
const chaiHttp = require('chai-http');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function () {
  this.timeout(5000);

  const project = 'apitest';
  let idFull, idRequiredOnly;

  // 1. Create an issue with every field
  test('Create an issue with every field: POST /api/issues/{project}', (done) => {
    chai.request(server)
      .post(`/api/issues/${project}`)
      .send({
        issue_title: 'Full Issue',
        issue_text: 'Text',
        created_by: 'Tester',
        assigned_to: 'Dev A',
        status_text: 'In QA'
      })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.property(res.body, '_id');
        assert.property(res.body, 'created_on');
        assert.property(res.body, 'updated_on');
        assert.property(res.body, 'open');
        assert.equal(res.body.issue_title, 'Full Issue');
        assert.equal(res.body.issue_text, 'Text');
        assert.equal(res.body.created_by, 'Tester');
        assert.equal(res.body.assigned_to, 'Dev A');
        assert.equal(res.body.status_text, 'In QA');
        assert.isTrue(res.body.open);
        idFull = res.body._id;
        done();
      });
  });

  // 2. Create an issue with only required fields
  test('Create an issue with only required fields: POST /api/issues/{project}', (done) => {
    chai.request(server)
      .post(`/api/issues/${project}`)
      .send({
        issue_title: 'Required Only',
        issue_text: 'Just the basics',
        created_by: 'Tester'
      })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.equal(res.body.issue_title, 'Required Only');
        assert.equal(res.body.issue_text, 'Just the basics');
        assert.equal(res.body.created_by, 'Tester');
        assert.property(res.body, 'assigned_to');
        assert.property(res.body, 'status_text');
        assert.equal(res.body.assigned_to, '');
        assert.equal(res.body.status_text, '');
        idRequiredOnly = res.body._id;
        done();
      });
  });

  // 3. Create an issue with missing required fields
  test('Create an issue with missing required fields: POST /api/issues/{project}', (done) => {
    chai.request(server)
      .post(`/api/issues/${project}`)
      .send({
        issue_title: 'Missing created_by',
        issue_text: 'x'
      })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { error: 'required field(s) missing' });
        done();
      });
  });

  // 4. View issues on a project
  test('View issues on a project: GET /api/issues/{project}', (done) => {
    chai.request(server)
      .get(`/api/issues/${project}`)
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        if (res.body.length) {
          const a = res.body[0];
          [
            '_id','issue_title','issue_text','created_by',
            'assigned_to','status_text','open','created_on','updated_on'
          ].forEach((k) => assert.property(a, k));
        }
        done();
      });
  });

  // 5. View issues with one filter
  test('View issues on a project with one filter: GET /api/issues/{project}', (done) => {
    chai.request(server)
      .get(`/api/issues/${project}?open=true`)
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        res.body.forEach((doc) => assert.isTrue(doc.open));
        done();
      });
  });

  // 6. View issues with multiple filters
  test('View issues on a project with multiple filters: GET /api/issues/{project}', (done) => {
    chai.request(server)
      .get(`/api/issues/${project}?open=true&created_by=Tester`)
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        res.body.forEach((doc) => {
          assert.isTrue(doc.open);
          assert.equal(doc.created_by, 'Tester');
        });
        done();
      });
  });

  // 7. Update one field
  test('Update one field on an issue: PUT /api/issues/{project}', (done) => {
    chai.request(server)
      .put(`/api/issues/${project}`)
      .send({ _id: idFull, open: 'false' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { result: 'successfully updated', _id: idFull });
        done();
      });
  });

  // 8. Update multiple fields
  test('Update multiple fields on an issue: PUT /api/issues/{project}', (done) => {
    chai.request(server)
      .put(`/api/issues/${project}`)
      .send({
        _id: idRequiredOnly,
        issue_text: 'Updated text',
        assigned_to: 'Dev B'
      })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { result: 'successfully updated', _id: idRequiredOnly });
        done();
      });
  });

  // 9. Update missing _id
  test('Update an issue with missing _id: PUT /api/issues/{project}', (done) => {
    chai.request(server)
      .put(`/api/issues/${project}`)
      .send({ issue_text: 'x' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { error: 'missing _id' });
        done();
      });
  });

  // 10. Update with no fields to update
  test('Update an issue with no fields to update: PUT /api/issues/{project}', (done) => {
    chai.request(server)
      .put(`/api/issues/${project}`)
      .send({ _id: idFull })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { error: 'no update field(s) sent', _id: idFull });
        done();
      });
  });

  // 11. Update invalid _id
  test('Update an issue with an invalid _id: PUT /api/issues/{project}', (done) => {
    const bad = '000000000000000000000000';
    chai.request(server)
      .put(`/api/issues/${project}`)
      .send({ _id: bad, issue_text: 'nope' })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { error: 'could not update', _id: bad });
        done();
      });
  });

  // 12. Delete an issue
  test('Delete an issue: DELETE /api/issues/{project}', (done) => {
    chai.request(server)
      .delete(`/api/issues/${project}`)
      .send({ _id: idRequiredOnly })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { result: 'successfully deleted', _id: idRequiredOnly });
        done();
      });
  });

  // 13. Delete invalid _id
  test('Delete an issue with an invalid _id: DELETE /api/issues/{project}', (done) => {
    const bad = 'ffffffffffffffffffffffff';
    chai.request(server)
      .delete(`/api/issues/${project}`)
      .send({ _id: bad })
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { error: 'could not delete', _id: bad });
        done();
      });
  });

  // 14. Delete missing _id
  test('Delete an issue with missing _id: DELETE /api/issues/{project}', (done) => {
    chai.request(server)
      .delete(`/api/issues/${project}`)
      .send({})
      .end((err, res) => {
        assert.equal(res.status, 200);
        assert.deepEqual(res.body, { error: 'missing _id' });
        done();
      });
  });
});
