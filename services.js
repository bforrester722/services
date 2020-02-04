/*
 *	simple web worker interface that uses Comlink RPC library
 *  with webpack worker-loader
 *
 *
 * 	example use:
 *
 *
 *	import services from '@spriteful/services/services.js';
 *
 *
 *	const getUserData = async () => {
 *	  try {
 *		  const data = await services.get({coll: 'users', doc: 'some uid string goes here'});
 *		  console.log('user data: ', data);
 * 			return data;
 *		}
 *		catch (error) { console.error('getUserData error: ', error); }
 *	};
 *
 *  const someUsersData = await getUserData();
 *
 */
import {
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
} from './db.js';
import * as comlink from 'comlinkjs/comlink.js';


let worker;
const {proxyValue} = comlink;

const checkWorker = async () => {
	if (!worker) {
		const {default: Worker} = 
			await import(/* webpackChunkName: 'worker' */ '@spriteful/worker/worker.js');
		worker = comlink.proxy(new Worker());
	}
};

const cloudFunction = async (...args) => {
	await checkWorker();
	return worker.cloudFunction(...args);
};

const deleteFile = async (...args) => {
	await checkWorker();
	return worker.deleteFile(...args);
};

const fileUpload = async (...args) => {
	await checkWorker();
	return worker.fileUpload(...args);
};

const getDownloadUrl = async (...args) => {
	await checkWorker();
	return worker.getDownloadUrl(...args);
};

const signOut = async (...args) => {
	await checkWorker();
	return worker.signOut(...args);
};

const services = {
	add,
	cloudFunction,
	deleteDocument,
	deleteField,
	deleteFile,
	enablePersistence,
	fileUpload,
	get,
	getDownloadUrl,
	getAll,
	query,
	querySubscribe,
	set,
	signOut,
	subscribe,
	textStartsWithSearch,
	getCollGroup
}; // promises


export {proxyValue};

export default services;
