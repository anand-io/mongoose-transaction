describe("Transaction", function() {
  var mongoose = require('mongoose');
  mongoose.connect("mongodb://localhost/test");
  var userSchema = require("./helpers/UserSchema");
  mongoose.model('User', userSchema);
  var Transaction = require('../index')(mongoose);


  beforeEach(function(done) {
    mongoose.model('User').remove({}, function(){
      done();
    });
  });

  it("should properly insert User data into Db", function(done) {
    var transaction = new Transaction();
    transaction.insert('User', {userId:'someuser1' , emailId:'test email1'});
    transaction.run(function(err, docs){
        mongoose.model('User').findOne({userId:'someuser1'}, function(err, docs){
          expect(docs.emailId).toEqual('test email1');
          done();
        });
    });
  });

  it("should rollback one insert when other insert fails", function(done) {
    var transaction = new Transaction();
    transaction.insert('User', {userId:'someuser1' , emailId:'test email1'});
    transaction.insert('User', {});
    transaction.run(function(err, docs){
        mongoose.model('User').findOne({userId:'someuser1'}, function(err, docs){
          expect(docs).toEqual(null);
          done();
        });
    });
  });

  it("should update when there is no fails", function(done) {
    mongoose.model('User')({userId:'someuser1' , emailId:'test email1'}).save(function(err, doc){
      expect(doc).not.toBe(null);
      expect(doc.userId).toEqual("someuser1");
      var transaction = new Transaction();
      transaction.update('User', doc._id, {userId:'someuser2' , emailId:'test email2'});
      transaction.run(function(err, docs){
        mongoose.model('User').findOne({_id:doc._id}, function(err, docs){
          expect(docs.userId).toEqual("someuser2");
          done();
        });
      });
    });
  });

  it("should rollback update when one insert fails", function(done) {
    mongoose.model('User')({userId:'someuser1' , emailId:'test email1'}).save(function(err, doc){
      expect(doc).not.toBe(null);
      expect(doc.userId).toEqual("someuser1");
      var transaction = new Transaction();
      transaction.update('User', doc._id, {userId:'someuser2' , emailId:'test email2'});
      transaction.insert('User', {});
      transaction.run(function(err, docs){
        mongoose.model('User').findOne({userId:'someuser1'}, function(err, docs){
          expect(docs.userId).toEqual("someuser1");
          done();
        });
      });
    });
  });

  it("should rollback remove when one insert fails", function(done) {
    mongoose.model('User')({userId:'someuser1' , emailId:'test email1'}).save(function(err, doc){
      expect(doc).not.toBe(null);
      expect(doc.userId).toEqual("someuser1");
      var transaction = new Transaction();
      transaction.remove('User', doc._id);
      transaction.insert('User', {});
      transaction.run(function(err, docs){
        mongoose.model('User').findOne({_id:doc._id}, function(err, docs){
          expect(docs.userId).toEqual("someuser1");
          done();
        });
      });
    });
  });

});
