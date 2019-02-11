
// must use module resolution in webpack config and include app.config.js file in root
// of src folder (ie. resolve: {modules: [path.resolve(__dirname, 'src'), 'node_modules'],})

import {firebaseConfig} from 'app.config.js';
import * as firebase 		from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
    
const app 			= firebase.initializeApp(firebaseConfig);
const firestore = app.firestore();
app.auth().useDeviceLanguage();

export {firebase, firestore};
