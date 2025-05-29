import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import FileUpload from './FileUpload.jsx'
import '@ant-design/v5-patch-for-react-19';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FileUpload />
  </StrictMode>,
)
