const express = require("express");

const db = require("../db");
const router = new express.Router();

const { BadRequestError, NotFoundError } = require("../expressError");

router.get('/', async function (req, res) {
  const results = await db.query(
    `SELECT code, name
      FROM companies`
  );

  const companies = results.rows;

  return res.json({ companies });
});

router.get('/:code', async function (req, res) {
  const code = req.params.code;
  const results = await db.query(
    `
    SELECT code, name, description
      FROM companies
        WHERE code IN ($1)`,
    [code]
  );

  const company = results.rows[0];

  if (!company) throw new NotFoundError(`Not found: ${code}`);
  return res.json({ company });
});

router.post('/', async function (req, res) {

  if (req.body === undefined) throw new BadRequestError();

  const requiredKeys = ['code', 'name', 'description'];
  const passedKeys = Object.keys(req.body);

  if (passedKeys.length !== 3 ||
    !passedKeys.every(key => requiredKeys.includes(key))
  ) {
    throw new BadRequestError();
  }

  const {code, name, description} = req.body;
  const result = await db.query(
    `
    INSERT INTO companies (code, name, description)
      VALUES ($1,$2,$3)
      RETURNING code, name, description
    `,
    [code,name,description]
  );

  const company = result.rows[0]

  return res.status(201).json({company})

})


//if (req.body === undefined) throw new BadRequestError();
module.exports = router;