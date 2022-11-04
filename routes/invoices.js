'use strict';

/**Routes about invoices */
const express = require("express");

const db = require("../db");
const router = new express.Router();

module.exports = router;

const { BadRequestError, NotFoundError } = require("../expressError");

/**GET / - returns {invoices: [{id, comp_code}, ...]} */
router.get('/', async function (req, res) {
  const results = await db.query(
    `
      SELECT id, comp_code
        FROM invoices
        ORDER BY id
    `);

  const invoices = results.rows;

  return res.json({ invoices });
});

/**GET /
 * Returns
 * {invoice: {
 *      id,
 *      amt,
 *      paid,
 *      add_date,
 *      paid_date,
 *      company: {code, name, description}
 * }
 *
 * */
router.get('/:id', async function (req, res) {
  const idStr = req.params.id;

  if (isNaN(Number(idStr))) throw new BadRequestError("Id must be an integer.");

  const id = Number(idStr);
  const iResults = await db.query(
    `
      SELECT id, amt, paid, add_date, paid_date
        FROM invoices
          WHERE id = $1`,
    [id]
  );
  const invoice = iResults.rows[0];
  if (!invoice) throw new NotFoundError(`Not found: ${id}`);

  const cResults = await db.query(
    // TODO: could have avoided join table by pulling comp_code earlier
    `
        SELECT code, name, description
            FROM companies AS c
            JOIN invoices AS i
                ON i.comp_code = c.code
            WHERE i.id = $1
        `,
    [id]
  );
  const company = cResults.rows[0];

  invoice.company = company;
  return res.json({ invoice });
});

/**POST / - receives {comp_code, amt}
* - returns {invoice: {id, comp_code, amt, paid, add_date, paid_date}} */
router.post('/', async function (req, res) {

  if (req.body === undefined) throw new BadRequestError('No data received');

  const requiredKeys = ['comp_code', 'amt'];
  const passedKeys = Object.keys(req.body);

  if (passedKeys.length !== requiredKeys.length ||
    !passedKeys.every(key => requiredKeys.includes(key))
  ) {
    throw new BadRequestError('Invalid JSON format');
  }

  const { comp_code, amt } = req.body;
  const cResults = await db.query(
    `
        SELECT code
            FROM companies
        `
  );

  const companyNames = cResults.rows.map(c => c.code);

  if (!companyNames.includes(comp_code)) {
    throw new BadRequestError(`Invalid company code ${comp_code}`);
  }

  if (isNaN(Number(amt))) throw new BadRequestError("Amount must be a number.");
  const numAmt = Number(amt);

  const result = await db.query(
    `
        INSERT INTO invoices (comp_code, amt)
            VALUES ($1,$2)
            RETURNING id, comp_code, amt, paid, add_date, paid_date
        `,
    [comp_code, numAmt]
  );

  const invoice = result.rows[0];

  return res.status(201).json({ invoice });

});

/**PUT / - receives {amt}
 * - returns {invoice: {id, comp_code, amt, paid, add_date, paid_date}} */
router.put('/:id', async function (req, res) {
  if (req.body === undefined) throw new BadRequestError('No data received');

  const requiredKeys = ['amt'];
  const passedKeys = Object.keys(req.body);

  if (passedKeys.length !== requiredKeys.length ||
    !passedKeys.every(key => requiredKeys.includes(key))
  ) {
    throw new BadRequestError('Invalid JSON format');
  }


  const idStr = req.params.id;
  if (isNaN(Number(idStr))) throw new BadRequestError("Id must be an integer.");
  const id = Number(idStr);

  const { amt } = req.body;

  if (isNaN(Number(amt))) throw new BadRequestError("Amt must be an integer.");

  const result = await db.query(
    `UPDATE invoices
      SET amt=$1
      WHERE id=$2
      RETURNING id, comp_code, amt, paid, add_date, paid_date`,
    [amt, id]
  );

  const invoice = result.rows[0];
  if (!invoice) throw new NotFoundError(`Invoice Id not found: ${id}`);
  return res.json({ invoice });
});

/**DELETE / - deletes invoice and returns {status: "deleted"} */
router.delete('/:id', async function (req, res) {

  const idStr = req.params.id;

  if (isNaN(Number(idStr))) throw new BadRequestError("Id must be an integer.");

  const id = Number(idStr);

  const result = await db.query(
    `DELETE FROM invoices WHERE id = $1
    RETURNING id`,
    [id],
  );

  const invoice = result.rows[0];

  if (!invoice) throw new NotFoundError(`Invoice Id not found: ${id}`);

  return res.json({ status: "deleted" });

});