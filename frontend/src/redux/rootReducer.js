import { combineReducers } from "redux";
import storage from "redux-persist/lib/storage";

import appReducer from "./slices/app";
import authReducer from "./slices/auth";
import audioCallReducer from "./slices/audioCall";
import videoCallReducer from "./slices/videoCall";
import conversationReducer from "./slices/Conversation";

const rootPersistConfig = {
  key: "root",
  storage,
  keyPrefix: "redux-",

  // Don't persist authentication state
  blacklist: ["auth"],
};

const rootReducer = combineReducers({
  app: appReducer,
  auth: authReducer,
  conversation: conversationReducer,
  audioCall: audioCallReducer,
  videoCall: videoCallReducer,
});

export { rootPersistConfig, rootReducer };