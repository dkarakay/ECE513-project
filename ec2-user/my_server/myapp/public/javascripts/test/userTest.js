const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../server'); // Make sure your server exports the app
const should = chai.should();

chai.use(chaiHttp);

describe('Users', () => {
  describe('/POST register', () => {
    it('it should register a user', (done) => {
      let user = {
        username: "testuser",
        email: "test@example.com",
        password: "123456"
      }
      chai.request(server)
        .post('/users/register')
        .send(user)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          done();
        });
    });
  });
});
