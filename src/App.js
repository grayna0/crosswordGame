import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Page1 from './app/page1/page';
import Page2 from './app/page2/page';
import Page3 from './app/page3/page';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Page1 />} />
        <Route path="/1" element={<Page1 />} />
        <Route path="/2" element={<Page2 />} />
        <Route path="/3" element={<Page3 />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
