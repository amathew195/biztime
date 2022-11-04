"use strict";
process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const db = require("../db");

let company;
let invoice;

beforeEach(async function(){
    await db.query(`DELETE FROM companies`);
    let cResult = await db.query(
        `
        INSERT INTO companies (code,name,description)
        VALUES('testCoCode', 'testCoName', 'We test things')
        RETURNING code, name, description
        `
    );
    company = cResult.rows[0];

    await db.query(`DELETE FROM invoices`);
    let iResult = await db.query(
        `
        INSERT INTO invoices (comp_code, amt)
        VALUES('testCoCode', 100)
        RETURNING id, comp_code, amt, paid, add_date, paid_date
        `
    );
    invoice = iResult.rows[0];
    console.log("invoice>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", invoice);
});

describe("GET /companies", function(){
    test("Get all companies in DB", async function () {
        const resp = await request(app).get("/companies");
        expect(resp.body).toEqual(
            {
                "companies": [
                    {
                        "code": "testCoCode",
                        "name": "testCoName"
                    }
                ]
            }
        )
    }); 
});

describe("GET /companies/:code", function(){
    test("Get a single company from DB", async function() {
        const resp = await request(app).get("/companies/testCoCode");
        expect(resp.body).toEqual(
            {
                company:{
                    code:'testCoCode',
                    name:'testCoName',
                    description:'We test things',
                    invoices:[
                        invoice.id
                    ]
                }
            }
        );
    });

    test("Attempt nonexistant code from DB", async function(){
        const resp = await request(app).get("/companies/notHere");
        expect(resp.statusCode).toEqual(404);
        expect(resp.body).toEqual(
            {
                "error": {
                    "message": "Not found: notHere",
                    "status": 404
                }
            }
        )

    })
});