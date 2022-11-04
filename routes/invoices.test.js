"use strict";
process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const db = require("../db");

let company;
let company2;
let invoice;

beforeEach(async function () {
  await db.query(`DELETE FROM companies`);

  let cResult = await db.query(
    `INSERT INTO companies (code,name,description)
      VALUES('testCoCode', 'testCoName', 'We test things')
      RETURNING code, name, description`
  );
  company = cResult.rows[0];

  let cResult2 = await db.query(
    `INSERT INTO companies (code,name,description)
      VALUES('testCompany2', 'testCompanyName2', 'description2')
      RETURNING code, name, description`
  );
  company2 = cResult2.rows[0];

  await db.query(`DELETE FROM invoices`);
  let iResult = await db.query(
    `INSERT INTO invoices (comp_code, amt)
      VALUES('testCoCode', 100)
      RETURNING id, comp_code, amt, paid, add_date, paid_date`
  );
  invoice = iResult.rows[0];

});

afterAll(async function () {
  await db.end();
});

describe("GET /invoices", function () {
  test("Get all invoices in DB", async function () {
    const resp = await request(app).get("/invoices");
    expect(resp.body).toEqual(
      {
        "invoices": [
          {
            "id": invoice.id,
            "comp_code": invoice.comp_code
          }
        ]
      }
    );
  });
});

describe("GET /invoices/:id", function () {
  test("Get a single invoice from DB", async function () {
    const resp = await request(app).get(`/invoices/${invoice.id}`);
    expect(resp.body).toEqual(
      {
        invoice: {
          id: invoice.id,
          amt: invoice.amt,
          paid: invoice.paid,
          add_date: invoice.add_date,
          paid_date: invoice.paid_date,
          company: {
            code: company.code,
            name: company.name,
            description: company.description,
          }
        }
      }
    );
  });

  test("Invalid invoice from DB", async function () {
    const resp = await request(app).get("/invoices/0");
    expect(resp.statusCode).toEqual(404);
    expect(resp.body).toEqual(
      {
        "error": {
          "message": "Not found: 0",
          "status": 404
        }
      }
    );

  });
});

describe("POST /invoices", function () {
  test("Add a new invoice to DB", async function () {

    const resp = await request(app)
      .post("/invoices")
      .send({
        'comp_code': 'testCompany2',
        'amt': 999
      });

    expect(resp.statusCode).toEqual(201);

    const iResult = await db.query(
      `SELECT id, comp_code, amt, paid, add_date, paid_date
          FROM invoices
           WHERE comp_code = 'testCompany2'`
    );

    const invoice = iResult.rows[0];

    expect(resp.body).toEqual(
      {
        "invoice":
        {
          id: invoice.id,
          comp_code: invoice.comp_code,
          amt: invoice.amt,
          paid: invoice.paid,
          add_date: invoice.add_date,
          paid_date: invoice.paid_date,
        }
      }
    );
  });

  test("Invalid JSON format", async function () {
    const resp = await request(app)
      .post("/invoices")
      .send({
        "amt": 999,
      });
    expect(resp.statusCode).toEqual(400);
    expect(resp.body).toEqual(
      {
        "error": {
          "message": "Invalid JSON format",
          "status": 400
        }
      }
    );
  });
});

describe("PUT /invoices/:id", function () {
  test("Update existing invoice in DB", async function () {
    const resp = await request(app)
      .put(`/invoices/${invoice.id}`)
      .send({
        "amt": 1,
      });
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual(
      {
        "invoice":
        {
          id: invoice.id,
          comp_code: invoice.comp_code,
          amt: "1.00",
          paid: invoice.paid,
          add_date: invoice.add_date,
          paid_date: invoice.paid_date
        }
      }
    );
  });

  test("Invalid JSON format", async function () {
    const resp = await request(app)
      .put(`/invoices/${invoice.id}`)
      .send({
        "amount": 1,
      });
    expect(resp.statusCode).toEqual(400);
    expect(resp.body).toEqual(
      {
        "error": {
          "message": "Invalid JSON format",
          "status": 400
        }
      }
    );
  });

  test("Invalid invoice id", async function () {
    const resp = await request(app)
      .put("/invoices/0")
      .send({
        "amt": 1,
      });
    expect(resp.statusCode).toEqual(404);
    expect(resp.body).toEqual(
      {
        "error": {
          "message": "Invoice Id not found: 0",
          "status": 404
        }
      }
    );
  });
});

describe("DELETE /invoices/:id", function () {
  test("Delete invoice in DB", async function () {
    const resp = await request(app)
      .delete(`/invoices/${invoice.id}`);
    expect(resp.statusCode).toEqual(200);
    expect(resp.body).toEqual({ status: "deleted" }
    );
  });

  test("Invalid invoice id", async function () {
    const resp = await request(app)
      .delete("/invoices/0");
    expect(resp.statusCode).toEqual(404);
    expect(resp.body).toEqual(
      {
        "error": {
          "message": "Invoice Id not found: 0",
          "status": 404
        }
      }
    );
  });
});