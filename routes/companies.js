'use strict';

/**Routes about companies */
const express = require("express");

const db = require("../db");
const router = new express.Router();

const { BadRequestError, NotFoundError } = require("../expressError");

/**GET / - returns {companies: [{code, name}, ...]} */
router.get('/', async function (req, res) {
  const results = await db.query(
    `SELECT code, name
      FROM companies
      ORDER BY code`
  );

  const companies = results.rows;

  return res.json({ companies });
});

/**GET / - returns {company: {code, name, description, invoices: [id, ...]}} */
router.get('/:code', async function (req, res) {
  const code = req.params.code;

  const cResults = await db.query(
    `SELECT code, name, description
      FROM companies
        WHERE code = $1`,
    [code]
  );

  const company = cResults.rows[0];
  if (!company) throw new NotFoundError(`Not found: ${code}`);

  const iResults = await db.query(
    `SELECT i.id
      FROM invoices as i
      JOIN companies as c
        ON i.comp_code = c.code
      WHERE c.code = $1`,
    [code]
  );

  company.invoices = iResults.rows.map(i => i.id);

  return res.json({ company });
});

/**POST / - receives {code, name, description}
 * - returns {companies: {company: {code, name, description}} */
router.post('/', async function (req, res) {

  if (req.body === undefined) throw new BadRequestError('No data received');

  const requiredKeys = ['code', 'name', 'description'];
  const passedKeys = Object.keys(req.body);

  if (passedKeys.length !== requiredKeys.length ||
    !passedKeys.every(key => requiredKeys.includes(key))
  ) {
    throw new BadRequestError('Invalid JSON format');
  }

  const { code, name, description } = req.body;
  const result = await db.query(
    `
    INSERT INTO companies (code, name, description)
      VALUES ($1,$2,$3)
      RETURNING code, name, description
    `,
    [code, name, description]
  );

  const company = result.rows[0];

  return res.status(201).json({ company });

});

/**PUT / - receives {name, description}
 * - returns {company: {code, name, description}} */
router.put('/:code', async function (req, res) {
  if (req.body === undefined) throw new BadRequestError('No data received');

  const requiredKeys = ['name', 'description'];
  const passedKeys = Object.keys(req.body);

  if (passedKeys.length !== requiredKeys.length ||
    !passedKeys.every(key => requiredKeys.includes(key))
  ) {
    throw new BadRequestError('Invalid JSON format');
  }

  const code = req.params.code;
  const { name, description } = req.body;
  const result = await db.query(
    `UPDATE companies
      SET name=$1,
          description=$2
      WHERE code=$3
      RETURNING code, name, description `,
    [name, description, code]
  );

  const company = result.rows[0];
  if (!company) throw new NotFoundError(`Not found: ${code}`);
  return res.json({ company });
});


/**DELETE / - deletes company and returns {status: "deleted"} */
router.delete('/:code', async function (req, res) {

  const code = req.params.code;
  const result = await db.query(
    `DELETE FROM companies WHERE code = $1
    RETURNING code, name, description`,
    [code],
  );

  if (!result.rows[0]) throw new NotFoundError(`Not found: ${code}`);

  return res.json({ status: "deleted" });

});


module.exports = router;