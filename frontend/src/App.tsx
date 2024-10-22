import React, { useEffect, useState } from 'react';
import Peer from 'simple-peer';
import { v4 as uuidv4 } from 'uuid';
import './App.css';
import { Main } from "./UI-Comps/Main";
import { ClientID } from "@shared/commTypes";
import {useMesh} from "./Hooks/Communication";

const App: React.FC = () => {
  useMesh(3);
  return <Main />;
};

export default App;