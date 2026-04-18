import { useState, useEffect } from 'react';
import { useInvestigationData } from './hooks/useInvestigationData';
import { Timeline } from './components/Timeline';
import { PersonList } from './components/PersonList';
import { PersonDetail } from './components/PersonDetail';
import { SearchBar } from './components/SearchBar';
import { SuspectPanel } from './components/SuspectPanel';

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-title">MISSING PODO</div>
      <div className="loading-sub">THE ANKARA CASE</div>
      <div className="loading-dots">
        <span />
        <span />
        <span />
      </div>
      <div className="loading-msg">Retrieving classified data...</div>
    </div>
  );
}

function ErrorScreen({ error, onRetry }) {
  return (
    <div className="loading-screen">
      <div className="loading-title error-title">Failed to load data</div>
      <div className="loading-msg">
        Failed to load investigation data. Please try again.
      </div>
      {error?.message && (
        <div className="error-detail">{error.message}</div>
      )}
      <button className="retry-btn" onClick={onRetry}>↺ Retry</button>
    </div>
  );
}

export default function App() {
  const { data, loading, error, retry } = useInvestigationData();
  const [searchQuery, setSearchQuery] = useState('');
  const [openPersons, setOpenPersons] = useState([]);

  function openPerson(key) {
    setOpenPersons(prev => {
      if (prev.includes(key)) return prev;
      if (prev.length >= 3) return [...prev.slice(1), key]; // drop oldest, add newest
      return [...prev, key];
    });
    setActiveTab('persons');
  }

  function closePerson(key) {
    setOpenPersons(prev => prev.filter(k => k !== key));
  }

  function togglePerson(key) {
    setOpenPersons(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : (prev.length >= 3 ? [...prev.slice(1), key] : [...prev, key])
    );
  }
  const [activeTab, setActiveTab] = useState('timeline');

  // Always clear search when the active tab changes
  useEffect(() => { setSearchQuery(''); }, [activeTab]);

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} onRetry={retry} />;

  const totalEvents =
    data.checkins.length +
    data.messages.length +
    data.sightings.length +
    data.notes.length +
    data.tips.length;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="header-title">MISSING PODO</div>
          <div className="header-sub">THE ANKARA CASE — CLASSIFIED</div>
        </div>
        <div className="header-stats">
          <span className="stat-pill">{data.checkins.length} check-ins</span>
          <span className="stat-pill">{data.messages.length} messages</span>
          <span className="stat-pill">{data.sightings.length} sightings</span>
          <span className="stat-pill">{data.notes.length} notes</span>
          <span className="stat-pill tip-pill">{data.tips.length} tips</span>
          <span className="stat-pill total-pill">{totalEvents} total</span>
        </div>
      </header>

      <div className="search-wrapper">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          TIMELINE
        </button>
        <button
          className={`tab-btn ${activeTab === 'persons' ? 'active' : ''}`}
          onClick={() => setActiveTab('persons')}
        >
          PERSONS
        </button>
        <button
          className={`tab-btn ${activeTab === 'suspects' ? 'active' : ''}`}
          onClick={() => setActiveTab('suspects')}
        >
          SUSPECTS
        </button>
      </div>

      <main className="app-main">
        {activeTab === 'timeline' && (
          <Timeline
            data={data}
            searchQuery={searchQuery}
            onPersonClick={openPerson}
            onLocationClick={(loc) => setSearchQuery(loc)}
          />
        )}

        {activeTab === 'persons' && (
          <div className="persons-layout">
            <PersonList
              data={data}
              selectedKeys={openPersons}
              onSelect={togglePerson}
              searchQuery={searchQuery}
            />
            {openPersons.map(key => (
              <PersonDetail
                key={key}
                data={data}
                personKey={key}
                onClose={() => closePerson(key)}
                onPersonClick={openPerson}
                onLocationClick={(loc) => { setSearchQuery(loc); setActiveTab('timeline'); }}
              />
            ))}
          </div>
        )}

        {activeTab === 'suspects' && (
          <SuspectPanel data={data} />
        )}
      </main>
    </div>
  );
}
