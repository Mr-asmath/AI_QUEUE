import React, { useState, useEffect } from 'react';

function DoctorDashboard({ user, onLogout }) {
  const [patients, setPatients] = useState({
    waiting: [],
    with_doctor: [],
    completed: []
  });
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [suggestion, setSuggestion] = useState({
    suggestion_text: '',
    medicines: [],
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('waiting');
  
  // Medicine search and selection state
  const [medicineSearch, setMedicineSearch] = useState('');
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false);

  // Predefined medicine list with categories
  const medicineDatabase = [
    // Pain Killers
    { id: 1, name: 'Paracetamol', category: 'Pain Killer', dosage: '500mg', common: true },
    { id: 2, name: 'Ibuprofen', category: 'Pain Killer', dosage: '400mg', common: true },
    { id: 3, name: 'Naproxen', category: 'Pain Killer', dosage: '250mg', common: false },
    { id: 4, name: 'Diclofenac', category: 'Pain Killer', dosage: '50mg', common: true },
    
    // Antibiotics
    { id: 5, name: 'Amoxicillin', category: 'Antibiotic', dosage: '500mg', common: true },
    { id: 6, name: 'Azithromycin', category: 'Antibiotic', dosage: '250mg', common: true },
    { id: 7, name: 'Ciprofloxacin', category: 'Antibiotic', dosage: '500mg', common: false },
    { id: 8, name: 'Doxycycline', category: 'Antibiotic', dosage: '100mg', common: true },
    
    // Antihistamines
    { id: 9, name: 'Cetirizine', category: 'Antihistamine', dosage: '10mg', common: true },
    { id: 10, name: 'Loratadine', category: 'Antihistamine', dosage: '10mg', common: true },
    { id: 11, name: 'Fexofenadine', category: 'Antihistamine', dosage: '120mg', common: false },
    
    // Antacids
    { id: 12, name: 'Omeprazole', category: 'Antacid', dosage: '20mg', common: true },
    { id: 13, name: 'Pantoprazole', category: 'Antacid', dosage: '40mg', common: true },
    { id: 14, name: 'Ranitidine', category: 'Antacid', dosage: '150mg', common: false },
    
    // Cough & Cold
    { id: 15, name: 'Dextromethorphan', category: 'Cough Suppressant', dosage: '15mg', common: true },
    { id: 16, name: 'Guaifenesin', category: 'Expectorant', dosage: '200mg', common: true },
    { id: 17, name: 'Pseudoephedrine', category: 'Decongestant', dosage: '60mg', common: false },
    
    // Vitamins & Supplements
    { id: 18, name: 'Vitamin C', category: 'Vitamin', dosage: '500mg', common: true },
    { id: 19, name: 'Vitamin D3', category: 'Vitamin', dosage: '1000 IU', common: true },
    { id: 20, name: 'Calcium', category: 'Supplement', dosage: '500mg', common: true },
    { id: 21, name: 'Iron', category: 'Supplement', dosage: '65mg', common: false },
    
    // Anti-inflammatory
    { id: 22, name: 'Prednisolone', category: 'Steroid', dosage: '5mg', common: false },
    { id: 23, name: 'Meloxicam', category: 'Anti-inflammatory', dosage: '15mg', common: true },
    
    // Diabetes
    { id: 24, name: 'Metformin', category: 'Diabetes', dosage: '500mg', common: true },
    { id: 25, name: 'Glimiperide', category: 'Diabetes', dosage: '2mg', common: false },
    
    // Blood Pressure
    { id: 26, name: 'Amlodipine', category: 'BP Medication', dosage: '5mg', common: true },
    { id: 27, name: 'Losartan', category: 'BP Medication', dosage: '50mg', common: true },
    { id: 28, name: 'Metoprolol', category: 'BP Medication', dosage: '50mg', common: false },
  ];

  // Group medicines by category
  const medicinesByCategory = medicineDatabase.reduce((acc, medicine) => {
    if (!acc[medicine.category]) {
      acc[medicine.category] = [];
    }
    acc[medicine.category].push(medicine);
    return acc;
  }, {});

  // Filter medicines based on search
  const filteredMedicines = medicineSearch
    ? medicineDatabase.filter(med => 
        med.name.toLowerCase().includes(medicineSearch.toLowerCase()) ||
        med.category.toLowerCase().includes(medicineSearch.toLowerCase())
      )
    : medicineDatabase;

  // Get common medicines
  const commonMedicines = medicineDatabase.filter(med => med.common);

  useEffect(() => {
    fetchPatients();
    const interval = setInterval(fetchPatients, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/doctor/patients', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setPatients(data.patients);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const callPatient = async (tokenId) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/doctor/call-patient/${tokenId}`, {
        method: 'PUT',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Called patient: ${data.user_name}`);
        fetchPatients();
      } else {
        alert(data.error || 'Error calling patient');
      }
    } catch (error) {
      alert('Error calling patient');
    } finally {
      setLoading(false);
    }
  };

  const addMedicine = (medicine) => {
    const medicineWithDosage = `${medicine.name} (${medicine.dosage})`;
    if (!selectedMedicines.includes(medicineWithDosage)) {
      setSelectedMedicines([...selectedMedicines, medicineWithDosage]);
    }
    setMedicineSearch('');
    setShowMedicineDropdown(false);
  };

  const removeMedicine = (medicineToRemove) => {
    setSelectedMedicines(selectedMedicines.filter(med => med !== medicineToRemove));
  };

  const addCustomMedicine = () => {
    if (medicineSearch.trim()) {
      setSelectedMedicines([...selectedMedicines, medicineSearch.trim()]);
      setMedicineSearch('');
      setShowMedicineDropdown(false);
    }
  };

  const addSuggestion = async (tokenId) => {
    if (!suggestion.suggestion_text) {
      alert('Please add a suggestion');
      return;
    }

    if (selectedMedicines.length === 0) {
      alert('Please add at least one medicine');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/doctor/add-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          token_id: tokenId,
          suggestion_text: suggestion.suggestion_text,
          medicines: selectedMedicines,
          notes: suggestion.notes
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Suggestion added successfully');
        setSuggestion({
          suggestion_text: '',
          medicines: [],
          notes: ''
        });
        setSelectedMedicines([]);
        setSelectedPatient(null);
        fetchPatients();
      } else {
        alert(data.error || 'Error adding suggestion');
      }
    } catch (error) {
      alert('Error adding suggestion');
    } finally {
      setLoading(false);
    }
  };

  const completePatient = async (tokenId) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/doctor/complete-patient/${tokenId}`, {
        method: 'PUT',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Patient consultation completed');
        setSelectedPatient(null);
        fetchPatients();
      } else {
        alert(data.error || 'Error completing consultation');
      }
    } catch (error) {
      alert('Error completing consultation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard doctor-dashboard">
      <div className="dashboard-header">
        <h1>{user.name}'s Dashboard</h1>
        <div className="stats-summary">
          <span className="stat">Waiting: {patients.waiting.length}</span>
          <span className="stat">With Doctor: {patients.with_doctor.length}</span>
          <span className="stat">Completed Today: {patients.completed.length}</span>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={activeTab === 'waiting' ? 'active' : ''}
          onClick={() => setActiveTab('waiting')}
        >
          Waiting Queue ({patients.waiting.length})
        </button>
        <button 
          className={activeTab === 'current' ? 'active' : ''}
          onClick={() => setActiveTab('current')}
        >
          Current Patients ({patients.with_doctor.length})
        </button>
        <button 
          className={activeTab === 'completed' ? 'active' : ''}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({patients.completed.length})
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'waiting' && (
          <div className="waiting-patients">
            <h3>Patients Waiting</h3>
            <div className="patient-grid">
              {patients.waiting.map(patient => (
                <div key={patient.token_id} className="patient-card">
                  <div className="patient-header">
                    <span className="token-badge">#{patient.token_number}</span>
                    <h4>{patient.user_name}</h4>
                  </div>
                  <p className="patient-email">{patient.user_email}</p>
                  <p className="waiting-time">Waiting: {patient.waiting_time} min</p>
                  <p className="token-time">Since: {patient.created_at}</p>
                  <button 
                    className="call-btn"
                    onClick={() => callPatient(patient.token_id)}
                    disabled={loading}
                  >
                    Call Patient
                  </button>
                </div>
              ))}
              {patients.waiting.length === 0 && (
                <p className="no-patients">No patients waiting</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'current' && (
          <div className="current-patients">
            <h3>Current Consultations</h3>
            <div className="patient-grid">
              {patients.with_doctor.map(patient => (
                <div key={patient.token_id} className="patient-card current">
                  <div className="patient-header">
                    <span className="token-badge">#{patient.token_number}</span>
                    <h4>{patient.user_name}</h4>
                  </div>
                  <p>Called at: {patient.called_at}</p>
                  
                  {selectedPatient === patient.token_id ? (
                    <div className="suggestion-form">
                      <textarea
                        placeholder="Enter your diagnosis/recommendation"
                        value={suggestion.suggestion_text}
                        onChange={(e) => setSuggestion({
                          ...suggestion,
                          suggestion_text: e.target.value
                        })}
                        rows="3"
                      />
                      
                      {/* Medicine Selection */}
                      <div className="medicine-selection">
                        <label>Prescribed Medicines:</label>
                        
                        {/* Selected Medicines Tags */}
                        <div className="selected-medicines">
                          {selectedMedicines.map((medicine, index) => (
                            <span key={index} className="medicine-tag">
                              {medicine}
                              <button 
                                type="button"
                                onClick={() => removeMedicine(medicine)}
                                className="remove-medicine"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* Medicine Search */}
                        <div className="medicine-search-container">
                          <input
                            type="text"
                            placeholder="Search or type medicine name..."
                            value={medicineSearch}
                            onChange={(e) => {
                              setMedicineSearch(e.target.value);
                              setShowMedicineDropdown(true);
                            }}
                            onFocus={() => setShowMedicineDropdown(true)}
                            className="medicine-search-input"
                          />
                          
                          {showMedicineDropdown && (
                            <div className="medicine-dropdown">
                              {/* Quick Add Common Medicines */}
                              <div className="quick-medicines">
                                <strong>Common Medicines:</strong>
                                <div className="quick-medicine-list">
                                  {commonMedicines.slice(0, 8).map(med => (
                                    <button
                                      key={med.id}
                                      type="button"
                                      className="quick-medicine-btn"
                                      onClick={() => addMedicine(med)}
                                    >
                                      {med.name}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Search Results by Category */}
                              {medicineSearch ? (
                                <div className="search-results">
                                  {filteredMedicines.length > 0 ? (
                                    Object.entries(
                                      filteredMedicines.reduce((acc, med) => {
                                        if (!acc[med.category]) acc[med.category] = [];
                                        acc[med.category].push(med);
                                        return acc;
                                      }, {})
                                    ).map(([category, meds]) => (
                                      <div key={category} className="medicine-category">
                                        <strong>{category}:</strong>
                                        {meds.map(med => (
                                          <div
                                            key={med.id}
                                            className="medicine-item"
                                            onClick={() => addMedicine(med)}
                                          >
                                            {med.name} - {med.dosage}
                                          </div>
                                        ))}
                                      </div>
                                    ))
                                  ) : (
                                    <div className="no-results">
                                      <p>No matching medicines found.</p>
                                      <button 
                                        type="button"
                                        className="add-custom-btn"
                                        onClick={addCustomMedicine}
                                      >
                                        Add "{medicineSearch}" as custom medicine
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                // Show categories by default
                                Object.entries(medicinesByCategory).map(([category, meds]) => (
                                  <div key={category} className="medicine-category">
                                    <strong>{category}:</strong>
                                    {meds.slice(0, 5).map(med => (
                                      <div
                                        key={med.id}
                                        className="medicine-item"
                                        onClick={() => addMedicine(med)}
                                      >
                                        {med.name} - {med.dosage}
                                      </div>
                                    ))}
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <textarea
                        placeholder="Additional notes (follow-up, precautions, etc.)"
                        value={suggestion.notes}
                        onChange={(e) => setSuggestion({
                          ...suggestion,
                          notes: e.target.value
                        })}
                        rows="2"
                      />
                      
                      <div className="form-actions">
                        <button 
                          className="submit-btn"
                          onClick={() => addSuggestion(patient.token_id)}
                          disabled={loading}
                        >
                          Submit Prescription
                        </button>
                        <button 
                          className="cancel-btn"
                          onClick={() => {
                            setSelectedPatient(null);
                            setSelectedMedicines([]);
                            setMedicineSearch('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="patient-actions">
                      <button 
                        className="suggest-btn"
                        onClick={() => {
                          setSelectedPatient(patient.token_id);
                          setSelectedMedicines([]);
                        }}
                      >
                        Add Prescription
                      </button>
                      <button 
                        className="complete-btn"
                        onClick={() => completePatient(patient.token_id)}
                        disabled={loading}
                      >
                        Complete
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {patients.with_doctor.length === 0 && (
                <p className="no-patients">No active consultations</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="completed-patients">
            <h3>Completed Today</h3>
            <div className="completed-list">
              {patients.completed.map((patient, index) => (
                <div key={index} className="completed-item">
                  <span className="token-num">#{patient.token_number}</span>
                  <span className="patient-name">{patient.user_name}</span>
                  <span className="complete-time">{patient.completed_at}</span>
                </div>
              ))}
              {patients.completed.length === 0 && (
                <p className="no-patients">No completed patients today</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorDashboard;
