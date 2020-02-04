
// must use module resolution in webpack config and include app.config.js file in root
// of src folder (ie. resolve: {modules: [path.resolve(__dirname, 'src'), 'node_modules'],})
import {firebase}  from '@spriteful/boot/boot.js';
import {firestore} from './firestore.js';


// Working with Timestamps:

// timestamps stored in Cloud Firestore will be read back as
// Firebase Timestamp objects instead of as system Date objects. So you will also
// need to update code expecting a Date to instead expect a Timestamp. For example:


//   const timestamp = snapshot.get('created_at');
//   const date = timestamp.toDate();



// orderBy === {name or prop, direction}
const buildCompoundRef = ({coll, endAt, limit, orderBy, startAt}) => {
	let ref = firestore.collection(coll);
	if (orderBy && (orderBy.name || orderBy.prop)) {
		const {direction = 'asc', name, prop} = orderBy;
		const by = name ? name : prop;
		ref = ref.orderBy(by, direction);
	}
	if (startAt) {
		ref = ref.startAt(startAt);
	}
	if (endAt) {
		ref = ref.endAt(endAt);
	}
	if (limit) {
		ref = ref.limit(limit);
	}
	return ref;
};


const buildCompoundQuery = (ref, query) => {
	if (Array.isArray(query)) {
		const compoundQuery = query.reduce((prev, curr) => {
			const {comparator, field, operator} = curr;
			prev = prev.where(field, operator, comparator);
			return prev;
		}, ref);
		return compoundQuery;
	}	
	const {comparator, field, operator} = query;
	return ref.where(field, operator, comparator);
};
// 'subscribe' helper
// ref can be for entire collection or specific doc
const getSubscribeRef = (coll, doc, endAt, limit, orderBy, startAt) => {
	if (doc && (endAt || limit || orderBy || startAt)) {
		throw new Error('Cannot apply search options to a single document.');
	}
	if (doc) {
		return firestore.collection(coll).doc(doc);
	}
	return buildCompoundRef({coll, endAt, limit, orderBy, startAt});
};
// 'subscribe' and 'querySubscribe' helper
// calls callback with document data
// returns a function that unsubscribes
const startSubscription = (ref, cb, onError) => {
	return ref.onSnapshot(snapshot => {
		if (snapshot.exists || ('empty' in snapshot && snapshot.empty === false)) {
			if (snapshot.docs) {
				const data = [];
				snapshot.forEach(doc => data.push(doc.data()));
				cb(data);
			} 
			else {
				const data = snapshot.data();
				cb(data);
			}
		} 
		else {
			onError({message: 'document does not exist'});
		}
	}, onError);
};
// offline, multi-tab persistence
// spriteful-settings via spriteful-shell
// the state is held in local-storage in app-shell
// can be changed by user in settings
// each device can have its own state
// in case user uses app on a shared device
const enablePersistence = async () => {
	try {
		await firestore.enablePersistence({synchronizeTabs: true});		
	}
	catch (error) {
    if (error.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled
        // in one tab at a a time.
        // ...
        console.warn('firestore persistence failed-precondition');
    } else if (error.code === 'unimplemented') {
        // The current browser does not support all of the
        // features required to enable persistence
        // ...
        console.warn('firestore persistence unimplemented');
    } else {
    	throw error;
    }
  }
};
// @@@@@ add data @@@@
// use a flattened data structure similar to realtime-database
// limit subcollections and nested data when possible
// harder to grok but better perf
// note: no multi-dimentional arrays can be stored
// firestore.collection("users").add({
//     first: "Ada",
//     last: "Lovelace",
//     born: 1815
// })
// .then(function(docRef) {
//     console.log("Document written with ID: ", docRef.id);
// })
// .catch(function(error) {
//     console.error("Error adding document: ", error);
// });
const add = async ({coll, data}) => {
	await firestore.collection(coll).add(data);
  return `${coll} document added`;
};

// must include coll, doc, data
const set = async ({coll, doc, data, merge = true}) => {
	// 'set' with merge true create a document if one does not already exist
	// and will only overwrite specified fields that are passed in
	await firestore.collection(coll).doc(doc).set(data, {merge});
  return `${doc} document set`;
};
// @@@@@@ get document data @@@@@@@
// var docRef = firestore.collection("cities").doc("SF");
// docRef.get().then(function(doc) {
//     if (doc.exists) {
//         console.log("Document data:", doc.data());
//     } else {
//         console.log("No such document!");
//     }
// }).catch(function(error) {
//     console.log("Error getting document:", error);
// });
// must include coll, doc
const get = async ({coll, doc}) => {
	const docData = await firestore.collection(coll).doc(doc).get();
  if (docData.exists) {
    return docData.data();
  }
  throw new Error(`No such document! ${coll}/${doc}`);
};
// @@@@@@ get all documents' data @@@@@
// firestore.collection("users").get().then((querySnapshot) => {
//     querySnapshot.forEach((doc) => {
//         console.log(`${doc.id} => ${doc.data()}`);
//     });
// });
// docs must be last level in the folder strucure,
// otherwise it returns an empty array
// must include coll
// can also include endAt, limit, orderBy, startAt
// orderBy === {name, direction}
const getAll = async job => {
	const ref 		 = buildCompoundRef(job);
	const snapshot = await ref.get();
	const allData  = [];
	snapshot.forEach(doc => {
		allData.push(doc.data());
	});
	return allData;
};
// @@@@@@@@ query collection @@@@@
// firestore.collection("cities").where("capital", "==", true)
//   .get()
//   .then(function(querySnapshot) {
//       querySnapshot.forEach(function(doc) {
//           console.log(doc.id, " => ", doc.data());
//       });
//   })
//   .catch(function(error) {
//       console.log("Error getting documents: ", error);
//   });
// must include: coll and query,
// options: endAt, limit, orderBy, startAt
// query is either an obj === {comparator, field, operator} or 
// array === [{comparator, field, operator}]
const query = async job => {
	const ref 		 = buildCompoundRef(job);
	const queryRef = buildCompoundQuery(ref, job.query);
	const snapshot = await queryRef.get();
	const allData  = [];
	snapshot.forEach(doc => {
		allData.push(doc.data());
	});
	return allData;
};
// @@@@@@@@ query collection group @@@@@
	// let museums = db.collectionGroup('landmarks').where('type', '==', 'museum');
	// museums.get().then(function(querySnapshot) {
	//   querySnapshot.forEach(function(doc) {
	//     console.log(doc.id, ' => ', doc.data());
	//   });
	// });
// Before using a collection group query, you must create an index that supports your collection group query.
// You can create an index through an error message, the console, or the Firebase CLI.
const getCollGroup = async (coll, field, operator, value) => {
	const query = await firestore.collectionGroup(coll).where(field, operator, value);
	const allData  = [];
	await query.get().then((querySnapshot) => {
  		querySnapshot.forEach(doc => {
    		allData.push(doc.data());
  		});
  	});

	return allData;
};
// @@@@@ subsribe to all doc changes @@@@@
// var unsubscribe = firestore.collection("cities")
//     .onSnapshot(function () {});
// // ...
// // Stop listening to changes
// unsubscribe();
// doc optional if you want to subscribe to the entire collection
// returns a promise that resolves to an 'unsubscribe' function,
// call unsubscribe to stop getting updates
const subscribe = ({
	coll, 
	doc, 
	callback, 
	errorCallback, 
	endAt, 
	limit, 
	orderBy, 
	startAt
}) => {
	const ref 				= getSubscribeRef(coll, doc, endAt, limit, orderBy, startAt);
	const unsubscribe = startSubscription(ref, callback, errorCallback);
	return unsubscribe;
};
// @@@@@@@@ subscribe to a query @@@@@@
// firestore.collection("cities").where("state", "==", "CA")
//     .onSnapshot(function(querySnapshot) {
//         var cities = [];
//         querySnapshot.forEach(function(doc) {
//             cities.push(doc.data().name);
//         });
//         console.log("Current cities in CA: ", cities.join(", "));
//     });
// must include coll, query
// query is either an obj === {comparator, field, operator} or 
// array === [{comparator, field, operator}]
// returns a promise that resolves to an 'unsubscribe' function,
// call unsubscribe to stop getting updates
const querySubscribe = job => {
	const {callback, errorCallback, query} = job;
	const ref 		 		= buildCompoundRef(job);
	const queryRef 		= buildCompoundQuery(ref, query);
	const unsubscribe = startSubscription(queryRef, callback, errorCallback);
	return unsubscribe;
};
// @@@@@@@@ delete a document @@@@@@@@@
// firestore.collection("cities").doc("DC").delete().then(function() {
//     console.log("Document successfully deleted!");
// }).catch(function(error) {
//     console.error("Error removing document: ", error);
// });
// must include coll, doc
const deleteDocument = async ({coll, doc}) => {
	await firestore.collection(coll).doc(doc).delete();
	return `${doc} document deleted`;
};
// @@@@@@@@ delete a field from a document @@@@@@
// var cityRef = firestore.collection('cities').doc('BJ');
// // Remove the 'capital' field from the document
// var removeCapital = cityRef.update({
//     capital: firebase.firestore.FieldValue.delete()
// });
// must include coll, doc, field
const deleteField = async ({coll, doc, field}) => {
	await firestore.collection(coll).doc(doc).
		update({[field]: firebase.firestore.FieldValue.delete()});
	return `${field} field deleted`;
};
// NOT a full-text search solution
const textStartsWithSearch = ({
	coll, 
	direction, 
	limit, 
	prop, 
	text
}) => {
	const orderBy = {prop, direction};
	const opts = {
		coll, 
		orderBy, 
		startAt: text, 
		endAt: 	`${text}\uf8ff`,
		limit
	};
	return getAll(opts);
};


export {
	add,
	deleteDocument,
	deleteField,
	enablePersistence,
	get,
	getAll,
	query,
	querySubscribe,
	set,
	subscribe,
	textStartsWithSearch,
	getCollGroup
};
