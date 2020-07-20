const chai = require("chai");
const should = chai.should();
const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const server = require("../index");

describe("GET /health - check server health", () => {
	it("should be healthy", done => {
		chai.request(server)
		.get("/health")
		.end((err, res) => {
			should.not.exist(err);
			res.status.should.equal(200);
			res.body.healthy.should.equal(true);
			done();
		});
	});
});

describe("GET /add - Additions", () => {
	it("should add two and two", done => {
		chai.request(server)
		.get("/add/2/2")
		.end((err, res) => {
			should.not.exist(err);
			res.status.should.equal(200);
			res.body.result.should.equal(4);
			done();
		});
	});
});