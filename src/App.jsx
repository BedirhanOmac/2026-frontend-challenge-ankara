import { useState } from 'react';
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

function ErrorScreen({ error }) {
  return (
    <div className="loading-screen">
      <div className="loading-title error-title">ACCESS DENIED</div>
      <div className="loading-msg">{error?.message || 'Failed to fetch investigation data.'}</div>
    </div>
  );
}

export default function App() {
  const { data, loading, error } = useInvestigationData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline');

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;

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
            onPersonClick={(key) => { setSelectedPerson(key); setActiveTab('persons'); }}
          />
        )}

        {activeTab === 'persons' && (
          <div className="persons-layout">
            <PersonList
              data={data}
              selectedKey={selectedPerson}
              onSelect={(key) => setSelectedPerson(key === selectedPerson ? null : key)}
              searchQuery={searchQuery}
            />
            {selectedPerson && (
              <PersonDetail
                data={data}
                personKey={selectedPerson}
                onClose={() => setSelectedPerson(null)}
                onPersonClick={(key) => setSelectedPerson(key)}
              />
            )}
          </div>
        )}

        {activeTab === 'suspects' && (
          <SuspectPanel data={data} />
        )}
      </main>
    </div>
  );
}
