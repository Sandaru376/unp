import React, { useState } from "react";
import Topbar from "./components/Topbar";
import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import Drawer from "./components/Drawer";
import ConfirmDialog from "./components/ConfirmDialog";
import Dashboard from "./pages/Dashboard";
import MapExplorer from "./pages/MapExplorer";
import People from "./pages/People";
import AddPerson from "./pages/AddPerson";
import Assignments from "./pages/Assignments";
import PoliticalHierarchy from "./pages/PoliticalHierarchy";
import OrganizationSetup from "./pages/OrganizationSetup";
import PersonProfile from "./pages/PersonProfile";
import { useOrganization } from "./context/OrganizationContext";

function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}

export default function App() {
  const { people, deletePerson } = useOrganization();

  const [view, setView] = useState("dash");
  const [nav, setNav] = useState({});
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [profilePersonId, setProfilePersonId] = useState(null);
  const [profileReturnView, setProfileReturnView] = useState("people");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [confirm, setConfirm] = useState(null);

  const notify = (message) => {
    setToast(message);

    window.clearTimeout(notify.timeoutId);

    notify.timeoutId = window.setTimeout(() => {
      setToast("");
    }, 2400);
  };

  /* Map navigation drills into a single location; the breadcrumb
   * chain (parentId) is rebuilt from the data every time. */
  const goMap = (locationId = null) => {
    setView("map");
    setNav({ locationId });
    setSelectedPersonId(null);
  };

  const navigate = (nextView) => {
    setView(nextView);
    setSelectedPersonId(null);

    if (nextView === "map") {
      setNav({});
    }
  };

  const goSetup = () => navigate("setup");

  const openPersonProfile = (personId) => {
    setProfileReturnView(view === "person-profile" ? profileReturnView : view);
    setProfilePersonId(personId);
    setSelectedPersonId(null);
    setView("person-profile");
  };

  const handleSearch = (value) => {
    setQuery(value);

    if (view !== "people") {
      setView("people");
      setSelectedPersonId(null);
    }
  };

  /*
   * Deleting a person also removes their assignments, so the store
   * asks for confirmation first when assignments exist.
   */
  const handleRemovePerson = (id) => {
    const result = deletePerson(id);

    if (result.ok) {
      finishRemovePerson(id);
      return;
    }

    if (result.confirm) {
      setConfirm({
        title: "Delete person?",
        message: result.error,
        confirmLabel: "Delete",
        onConfirm: () => {
          deletePerson(id, { force: true });
          setConfirm(null);
          finishRemovePerson(id);
        },
      });
      return;
    }

    notify(result.error);
  };

  const finishRemovePerson = (id) => {
    if (selectedPersonId === id) setSelectedPersonId(null);
    if (profilePersonId === id) {
      setProfilePersonId(null);
      setView("people");
    }
    notify("Person removed");
  };

  const profilePerson = people.find(
    (person) => person.id === profilePersonId,
  );

  return (
    <div className="shell">
      <Topbar
        query={query}
        onSearch={handleSearch}
        onHome={() => navigate("dash")}
      />

      <div className="app">
        <Sidebar view={view} onNavigate={navigate} />

        <main key={view}>
          {view === "dash" && <Dashboard goMap={goMap} />}

          {view === "map" && (
            <MapExplorer
              nav={nav}
              goMap={goMap}
              setSelectedPersonId={setSelectedPersonId}
              goSetup={goSetup}
            />
          )}

          {view === "people" && (
            <People
              people={people}
              query={query}
              setQuery={setQuery}
              onAdd={() => navigate("add")}
              setSelectedPersonId={setSelectedPersonId}
              removePerson={handleRemovePerson}
            />
          )}

          {view === "add" && (
            <AddPerson notify={notify} onDone={() => navigate("people")} />
          )}

          {view === "assignments" && (
            <Assignments notify={notify} goSetup={goSetup} />
          )}

          {view === "setup" && <OrganizationSetup notify={notify} />}

          {view === "hierarchy" && (
            <PoliticalHierarchy
              setSelectedPersonId={setSelectedPersonId}
              goSetup={goSetup}
            />
          )}

          {view === "person-profile" && (
            <PersonProfile
              person={profilePerson}
              onBack={() => {
                setView(profileReturnView || "people");
                setProfilePersonId(null);
              }}
            />
          )}
        </main>
      </div>

      <Drawer
        person={people.find((person) => person.id === selectedPersonId) || null}
        onClose={() => setSelectedPersonId(null)}
        goMap={goMap}
        onViewProfile={openPersonProfile}
        onRemove={handleRemovePerson}
      />

      <MobileNav view={view} onNavigate={navigate} />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
      />

      <Toast message={toast} />
    </div>
  );
}
