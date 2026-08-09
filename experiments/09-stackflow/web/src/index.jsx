import React from 'react';
import { createRoot } from 'react-dom/client';

import '@stackflow/plugin-basic-ui/index.css';
import { Stack } from './stackflow';

createRoot(document.getElementById('root')).render(<Stack />);
