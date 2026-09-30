import React from "react";
import { DEFAULT_USER_AVATAR } from "../utils/getAvatarUrl";
import {
  ChatCircleDots,
  CircleDashed,
  Gear,
  GearSix,
  Phone,
  SignOut,
  User,
  Users,
} from "phosphor-react";

const Profile_Menu = [
  {
    title: "Profile",
    icon: <User />,
  },
  {
    title: "Settings",
    icon: <Gear />,
  },
  {
    title: "logout",
    icon: <SignOut />,
  },
];

const Nav_Buttons = [
  {
    index: 0,
    icon: <ChatCircleDots />,
    title: "Chats",
  },
  {
    index: 1,
    icon: <CircleDashed />,
    title: "Status",
  },
  {
    index: 2,
    icon: <Users />,
    title: "Groups",
  },
  {
    index: 3,
    icon: <Phone />,
    title: "Calls",
  },
];

const Nav_Setting = [
  {
    index: 3,
    icon: <GearSix />,
  },
];

const getMockAvatar = () => DEFAULT_USER_AVATAR;

const MembersList = [
  {
    id: 0,
    img: DEFAULT_USER_AVATAR,
    name: "Alex Johnson",
    online: true,
  },
  {
    id: 1,
    img: DEFAULT_USER_AVATAR,
    name: "Sarah Connor",
    online: false,
  },
  {
    id: 2,
    img: DEFAULT_USER_AVATAR,
    name: "Michael Brown",
    online: true,
  },
  {
    id: 3,
    img: DEFAULT_USER_AVATAR,
    name: "Emma Watson",
    online: true,
  },
  {
    id: 4,
    img: DEFAULT_USER_AVATAR,
    name: "David Miller",
    online: false,
  },
];

const CallLogs = [
  {
    id: 0,
    img: DEFAULT_USER_AVATAR,
    name: "Alex Johnson",
    missed: false,
    incoming: true,
  },
  {
    id: 1,
    img: DEFAULT_USER_AVATAR,
    name: "Sarah Connor",
    missed: true,
    incoming: true,
  },
  {
    id: 2,
    img: DEFAULT_USER_AVATAR,
    name: "Michael Brown",
    missed: true,
    incoming: false,
  },
  {
    id: 3,
    img: DEFAULT_USER_AVATAR,
    name: "Emma Watson",
    missed: false,
    incoming: false,
  },
  {
    id: 4,
    img: DEFAULT_USER_AVATAR,
    name: "David Miller",
    missed: true,
    incoming: true,
  },
];

const ChatList = [
  {
    id: 0,
    img: DEFAULT_USER_AVATAR,
    name: "Alex Johnson",
    msg: "Hey there! How is everything going?",
    time: "9:36",
    unread: 0,
    pinned: true,
    online: true,
  },
  {
    id: 1,
    img: DEFAULT_USER_AVATAR,
    name: "Sarah Connor",
    msg: "Let's catch up later today",
    time: "12:02",
    unread: 2,
    pinned: true,
    online: false,
  },
  {
    id: 2,
    img: DEFAULT_USER_AVATAR,
    name: "Michael Brown",
    msg: "Did you review the documents?",
    time: "10:35",
    unread: 3,
    pinned: false,
    online: true,
  },
  {
    id: 3,
    img: DEFAULT_USER_AVATAR,
    name: "Emma Watson",
    msg: "See you at the meeting tomorrow",
    time: "04:00",
    unread: 0,
    pinned: false,
    online: true,
  },
  {
    id: 4,
    img: DEFAULT_USER_AVATAR,
    name: "David Miller",
    msg: "Thanks for the quick reply!",
    time: "08:42",
    unread: 0,
    pinned: false,
    online: false,
  },
  {
    id: 5,
    img: DEFAULT_USER_AVATAR,
    name: "James Wilson",
    msg: "All set for the presentation.",
    time: "08:42",
    unread: 0,
    pinned: false,
    online: false,
  },
  {
    id: 6,
    img: DEFAULT_USER_AVATAR,
    name: "Olivia Taylor",
    msg: "Great job on the project!",
    time: "08:42",
    unread: 0,
    pinned: false,
    online: false,
  },
  {
    id: 7,
    img: DEFAULT_USER_AVATAR,
    name: "Daniel Anderson",
    msg: "Can you send the link again?",
    time: "08:42",
    unread: 0,
    pinned: false,
    online: false,
  },
];

const Chat_History = [
  {
    type: "msg",
    message: "Hi 👋🏻, How are ya ?",
    incoming: true,
    outgoing: false,
  },
  {
    type: "divider",
    text: "Today",
  },
  {
    type: "msg",
    message: "Hi 👋, not bad, u ?",
    incoming: false,
    outgoing: true,
  },
  {
    type: "msg",
    message: "Can you send me a picture?",
    incoming: false,
    outgoing: true,
  },
  {
    type: "msg",
    message: "Ya sure, sending you a pic",
    incoming: true,
    outgoing: false,
  },
  {
    type: "msg",
    subtype: "img",
    message: "Here You Go",
    img: DEFAULT_USER_AVATAR,
    incoming: true,
    outgoing: false,
  },
  {
    type: "msg",
    message: "Can you please send this in file format?",
    incoming: false,
    outgoing: true,
  },
  {
    type: "msg",
    subtype: "doc",
    message: "Yes sure, here you go.",
    incoming: true,
    outgoing: false,
  },
  {
    type: "msg",
    subtype: "link",
    preview: DEFAULT_USER_AVATAR,
    message: "Yep, I can also do that",
    incoming: true,
    outgoing: false,
  },
  {
    type: "msg",
    subtype: "reply",
    reply: "This is a reply",
    message: "Yep, I can also do that",
    incoming: false,
    outgoing: true,
  },
];

const Message_options = [
  {
    title: "Reply",
  },
  {
    title: "React to message",
  },
  {
    title: "Forward message",
  },
  {
    title: "Star message",
  },
  {
    title: "Report",
  },
  {
    title: "Delete Message",
  },
];

const SHARED_LINKS = [
  {
    type: "msg",
    subtype: "link",
    preview: DEFAULT_USER_AVATAR,
    message: "Yep, I can also do that",
    incoming: true,
    outgoing: false,
  },
  {
    type: "msg",
    subtype: "link",
    preview: DEFAULT_USER_AVATAR,
    message: "Yep, I can also do that",
    incoming: true,
    outgoing: false,
  },
  {
    type: "msg",
    subtype: "link",
    preview: DEFAULT_USER_AVATAR,
    message: "Yep, I can also do that",
    incoming: true,
    outgoing: false,
  },
  {
    type: "msg",
    subtype: "link",
    preview: DEFAULT_USER_AVATAR,
    message: "Yep, I can also do that",
    incoming: true,
    outgoing: false,
  },
];

const SHARED_DOCS = [
  {
    type: "msg",
    subtype: "doc",
    message: "Yes sure, here you go.",
    incoming: true,
    outgoing: false,
  },
  {
    type: "msg",
    subtype: "doc",
    message: "Yes sure, here you go.",
    incoming: true,
    outgoing: false,
  },
  {
    type: "msg",
    subtype: "doc",
    message: "Yes sure, here you go.",
    incoming: true,
    outgoing: false,
  },
  {
    type: "msg",
    subtype: "doc",
    message: "Yes sure, here you go.",
    incoming: true,
    outgoing: false,
  },
];

export {
  Profile_Menu,
  Nav_Setting,
  Nav_Buttons,
  ChatList,
  Chat_History,
  Message_options,
  SHARED_DOCS,
  SHARED_LINKS,
  CallLogs,
  MembersList,
};
