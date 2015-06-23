var $ = require('jquery-deferred');


function Transaction (mongoose) {

	var transacts = [];
	var updateOrRemoveObjects = [];

	this.insert = function(collectionName, data){
		var  Model = mongoose.model(collectionName);
		if(!Model)
			throw new Error('Collection not found');
		transacts.push(constructInsertTask({ Model: Model, data:data, type: 'insert' }));
	};

	this.update = function(collectionName, objectId, data){

		var  Model = mongoose.model(collectionName);
		if(!Model)
			throw new Error('Collection not found');
		updateOrRemoveObjects.push({objectId: objectId, data:data, Model:Model, type:'update'});
		// var doc = Model(data);
		// var transact = { type: 'update', doc: doc };
		// storeOldDoc(objectId, transact);
	};

	this.remove = function(collectionName, objectId){
		var  Model = mongoose.model(collectionName);
		if(!Model)
			throw new Error('Collection not found');
		updateOrRemoveObjects.push({objectId: objectId, Model:Model, type:'remove'});
		// var transact = {type: 'remove'};
		// storeOldDoc(objectId, transact);
	};

	this.run = function(callback){
		var updateOrRemoveDeferredArray = [];
		updateOrRemoveObjects.forEach(function(docData){
			updateOrRemoveDeferredArray.push(getTask(docData));
		});

		$.when.apply($, updateOrRemoveDeferredArray).done(function(){
			var tasks = Array.prototype.slice.call(arguments);
			if(tasks && tasks.length > 0)
				transacts = transacts.concat(tasks);

	  		var transactsDeffered = [];
	  		transacts.forEach(function(transact){
	  			transactsDeffered.push(transact.call());
	  		});
	  		$.when.apply($, transactsDeffered).done(function(){
	  			results = Array.prototype.slice.call(arguments);
	  			var errs = [], successDocData = [], docs = [];
	  			results.forEach(function(result){
	  				if (!result)
	  					return;
	  				if (result[0]) errs.push(result[0]);
	  				if (result[1]) successDocData.push(result[1]);
	  				if (result[2]) docs.push(result[2]);
	  			});
	  			if(errs.length !== 0){
	  				var rollbacksDeffered = [];
	  				if (successDocData.length !== 0){
				  		successDocData.forEach(function(docData){
				  			rollbacksDeffered.push(rollback(docData));
				  		});
				  		$.when.apply($, rollbacksDeffered).done(function(docs){
				  			callback(docs);
				  		});
				  	}
	  			} else {
	  				callback(null, docs);
	  			}
	  		});
		}).fail(function(err){
			callback(err);
		});
	};

	function getTask (docData) {
		var deferred = $.Deferred();
		docData.Model.findById(docData.objectId, function(err, oldDoc){
			if(err)
				deferred.reject(err);
			else{
				var task;
				docData.oldDoc = oldDoc;
				if (docData.type === 'update') {
					task = constructUpdateTask(docData);
				} else if (docData.type === 'remove') {
					task = constructRemoveTask(docData);
				}	
				deferred.resolve(task);
			}
		});
		return deferred.promise();
	}

	function rollback (docData) {
		var deferred = $.Deferred();
		if (!docData || !docData.doc && !docData.oldDoc) { deferred.resolve(); }
		else {
			if(docData.type === 'insert')
				docData.doc.remove(function (err, doc) {
					if(err)
						deferred.reject(err);
					else
						deferred.resolve();
				});
			else if (docData.type === 'update') {
				for (var key in docData.oldDoc) {
					docData.doc[key] = docData.oldDoc[key];
				}
				docData.doc.save(function (err, doc){
					if(err)
						deferred.reject(err);
					else
						deferred.resolve();
				});
			}
			else if (docData.type === 'remove'){
				var oldDocData = JSON.parse(JSON.stringify(docData.oldDoc));
				var oldDoc = new docData.Model(oldDocData);
				oldDoc.save(function (err, doc){
					if(err)
						deferred.reject(err);
					else
						deferred.resolve();
				});
			}
		}
		return deferred.promise();
	}

	function constructUpdateTask (docData) {
		return function () {
			var deferred = $.Deferred();
			var oldDocData = JSON.parse(JSON.stringify(docData.oldDoc));
			docData.doc = docData.oldDoc;
			for (var key in docData.data) {
				docData.doc[key] = docData.data[key];
			}
			docData.doc.save(function(err, doc){
				if(err)
					deferred.resolve(err, null, null);
				else {
					docData.oldDoc = oldDocData;
					deferred.resolve(null, docData, doc);
				}
			});
			return deferred.promise();
		};
	}

	function constructRemoveTask (docData) {
		return function () {
			var deferred = $.Deferred();
			docData.oldDoc.remove(function(err, doc){
				if(err){
					deferred.resolve(err, null, null);
				}
				else {
					deferred.resolve(null, docData, doc);
				}
			});
			return deferred.promise();
		};
	}

	function constructInsertTask (docData) {
		return function () {
			var deferred = $.Deferred();
			var model = new docData.Model(docData.data);
			model.save(function(err, doc){
				if(err){
					deferred.resolve(err, null, null);
				}
				else {
					docData.doc = doc;
					deferred.resolve(null, docData, doc);
				}
			});
			return deferred.promise();
		};
	}
}

module.exports = function(mongoose) {
	return function (){
		return new Transaction(mongoose);
	};
};