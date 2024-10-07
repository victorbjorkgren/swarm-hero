import React from 'react';
import SpritesheetViewer from './SpritesheetViewer';

const App: React.FC = () => {
  return (
      <div className="flex justify-center items-center min-h-screen bg-gray-500">
        <SpritesheetViewer />
      </div>
  );
}

export default App;