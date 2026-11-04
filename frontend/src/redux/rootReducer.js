import { combineReducers } from "redux";
import storage from "redux-persist/lib/storage";

import appReducer from "./slices/app";
import authReducer from "./slices/auth";
import audioCallReducer from "./slices/audioCall";
import videoCallReducer from "./slices/videoCall";
import conversationReducer from "./slices/Conversation";
import statusReducer from "./slices/status";

const rootPersistConfig = {
  key: "root",
  storage,
  keyPrefix: "redux-",

  // Don't persist authentication, transient call dialog state, or heavy message/status payloads
  // (Conversation sidebar list is cached separately via trackon_cached_conversations)
  blacklist: ["auth", "audioCall", "videoCall", "conversation", "status"],
};

const rootReducer = combineReducers({
  app: appReducer,
  auth: authReducer,
  conversation: conversationReducer,
  audioCall: audioCallReducer,
  videoCall: videoCallReducer,
  status: statusReducer,
});

export { rootPersistConfig, rootReducer };