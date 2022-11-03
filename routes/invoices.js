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
    const id = req.params.id;
    if (isNaN(Number(id))) throw new BadRequestError("Id must be an integer.");

    const intId = Number(id);
    const iResults = await db.query(
        `
      SELECT id, amt, paid, add_date, paid_date
        FROM invoices
          WHERE id = $1`,
        [intId]
    );
    const invoice = iResults.rows[0];
    if (!invoice) throw new NotFoundError(`Not found: ${intId}`);

    const cResults = await db.query(
        `
        SELECT code, name, description
            FROM companies AS c
            JOIN invoices AS i
                ON i.comp_code = c.code
            WHERE i.id = $1
        `,
        [intId]
    );
    const company = cResults.rows[0];

    invoice.company = company;
    return res.json({ invoice });
});

/**POST / - receives {comp_code, amt}
* - returns {invoice: {id, comp_code, amt, paid, add_date, paid_date}} */
router.post('/', async function (req, res) {

    if (req.body === undefined) throw new BadRequestError();

    const requiredKeys = ['comp_code', 'amt'];
    const passedKeys = Object.keys(req.body);

    if (passedKeys.length !== requiredKeys.length ||
        !passedKeys.every(key => requiredKeys.includes(key))
    ) {
        throw new BadRequestError();
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
        throw new BadRequestError(`Invalid company code ${comp_code}`)
    }

    if (isNaN(Number(amt))) throw new BadRequestError("Amount must be a number.")
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