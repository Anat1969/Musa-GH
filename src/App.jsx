import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { readHash } from "./router.js";
import { listGenerations } from "./lib/supabase.js";
import Nav from "./components/Nav.jsx";
import Home from "./components/Home.jsx";
import Studio from "./components/Studio.jsx";
import Archive from "./components/Archive.jsx";
import Study from "./components/Study.jsx";

export default function App() {
  const [route, setRoute] = useState(readHash());
  const [gens, setGens] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  const load = useCallback(async () => {
    try { setGens(await listGenerations()); setStatus("ready"); }
    catch { setStatus(s => (s === "ready" ? s : "error")); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const on = () => { setRoute(readHash()); window.scrollTo({ top: 0 }); };
    const vis = () => document.visibilityState === "visible" && load();
    window.addEventListener("hashchange", on);
    window.addEventListener("popstate", on);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("hashchange", on);
      window.removeEventListener("popstate", on);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [load]);

  /* מחקר חדש נכנס מיד לרשימה, ומחקר שהושלמה לו תמונה מתעדכן במקומו */
  const add = useCallback(g => setGens(list => (list.some(x => x.id === g.id) ? list.map(x => (x.id === g.id ? g : x)) : [g, ...list])), []);

  const { page, item } = route;
  const current = page === "s" ? "archive" : page || "home";
  let view;
  if (page === "studio") view = <Studio initial={item} gens={gens} onCreated={add} />;
  else if (page === "archive") view = <Archive gens={gens} status={status} filter={item} retry={load} />;
  else if (page === "s") view = <Study id={item} gens={gens} status={status} onCreated={add} />;
  else view = <Home gens={gens} status={status} />;

  return (
    <>
      <Nav current={current} />
      <AnimatePresence mode="wait">
        <motion.main
          key={page + (page === "s" ? item : "")}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {view}
        </motion.main>
      </AnimatePresence>
    </>
  );
}
