import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Result from './pages/Result'
import Contact from './pages/Contact'
import Yukim from './pages/Yukim'
import Privacy from './pages/Privacy'

export default function App() {
  return (
    <Routes>
      <Route path="/"        element={<Home />} />
      <Route path="/result"  element={<Result />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/yukim"   element={<Yukim />} />
      <Route path="/privacy" element={<Privacy />} />
    </Routes>
  )
}
