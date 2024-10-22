import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './App.css';
import { Main } from "./UI-Comps/Main";
import { ClientID } from "@shared/commTypes";
import {connectMesh} from "./Hooks/Communication";

const App: React.FC = () => {
  return <Main />;
};

export default App;