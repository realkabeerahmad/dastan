"use client";

import { useState, useTransition, useEffect } from "react";
import { Plus, Building, MapPin, Loader2, ArrowLeft, Edit2, Tag, Info } from "lucide-react";
import styles from "./properties.module.css";
import { createProperty, updateProperty, getPropertyTypes, getPropertyStatuses } from "@/actions/property-actions";
import { getCountries, getStates, getCities } from "@/actions/location-actions";
import SearchableSelect from "@/components/ui/SearchableSelect";

export default function ManagePropertiesClient({ initialProperties }) {
  // 'list', 'add', 'edit'
  const [viewMode, setViewMode] = useState('list');
  const [editData, setEditData] = useState(null);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  // Location Options
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  // Type & Status Options
  const [types, setTypes] = useState([]);
  const [statuses, setStatuses] = useState([]);

  // Selections
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);

  // Load static data when form opens
  useEffect(() => {
    if (viewMode !== 'list') {
      getCountries().then(setCountries);
      getPropertyTypes().then(setTypes);
      getPropertyStatuses().then(setStatuses);
    }
  }, [viewMode]);

  // Load states when country changes
  useEffect(() => {
    if (selectedCountry?.id) {
      getStates(selectedCountry.id).then(res => {
        setStates(res);
        if (viewMode === 'add' || (viewMode === 'edit' && editData?.country !== selectedCountry.name)) {
          setSelectedState(null);
          setSelectedCity(null);
          setCities([]);
        }
      });
    } else {
      setStates([]);
    }
  }, [selectedCountry?.id, viewMode, editData]);

  // Load cities when state changes
  useEffect(() => {
    if (selectedState?.id) {
      getCities(selectedState.id).then(res => {
        setCities(res);
        if (viewMode === 'add' || (viewMode === 'edit' && editData?.state !== selectedState.name)) {
          setSelectedCity(null);
        }
      });
    } else {
      setCities([]);
    }
  }, [selectedState?.id, viewMode, editData]);

  // Pre-fill Edit Mode selections
  useEffect(() => {
    if (viewMode === 'edit' && editData && countries.length > 0 && !selectedCountry) {
      const match = countries.find(c => c.name === editData.country);
      if (match) setSelectedCountry(match);
    }
  }, [viewMode, editData, countries, selectedCountry]);

  useEffect(() => {
    if (viewMode === 'edit' && editData && states.length > 0 && !selectedState) {
      const match = states.find(s => s.name === editData.state);
      if (match) setSelectedState(match);
    }
  }, [viewMode, editData, states, selectedState]);

  useEffect(() => {
    if (viewMode === 'edit' && editData && cities.length > 0 && !selectedCity) {
      const match = cities.find(c => c.name === editData.city);
      if (match) setSelectedCity(match);
    }
  }, [viewMode, editData, cities, selectedCity]);

  // Pre-fill Edit Mode for Type & Status
  useEffect(() => {
    if (viewMode === 'edit' && editData && types.length > 0 && !selectedType && editData.property_type_name) {
      const match = types.find(t => t.name === editData.property_type_name);
      if (match) setSelectedType(match);
    }
  }, [viewMode, editData, types, selectedType]);

  useEffect(() => {
    if (viewMode === 'edit' && editData && statuses.length > 0 && !selectedStatus && editData.property_status_name) {
      const match = statuses.find(s => s.name === editData.property_status_name);
      if (match) setSelectedStatus(match);
    }
  }, [viewMode, editData, statuses, selectedStatus]);

  function resetForm() {
    setViewMode('list');
    setEditData(null);
    setSelectedCountry(null);
    setSelectedState(null);
    setSelectedCity(null);
    setSelectedType(null);
    setSelectedStatus(null);
    setErrorMsg("");
  }

  function handleAdd() {
    resetForm();
    setViewMode('add');
  }

  function handleEdit(prop) {
    resetForm();
    setEditData(prop);
    setViewMode('edit');
  }

  async function handleSubmit(formData) {
    setErrorMsg("");

    // Ensure selects have values that are populated in formData by hidden inputs
    startTransition(async () => {
      let res;
      if (viewMode === 'edit') {
        res = await updateProperty(editData.property_id, formData);
      } else {
        res = await createProperty(formData);
      }

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        resetForm();
      }
    });
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {viewMode === 'list' && "Manage Properties"}
            {viewMode === 'add' && "Add Property"}
            {viewMode === 'edit' && "Edit Property"}
          </h1>
          <p className={styles.subtitle}>
            {viewMode === 'list' && "View and manage your real estate assets."}
            {viewMode === 'add' && "Add a new property to your portfolio."}
            {viewMode === 'edit' && "Update property details and location."}
          </p>
        </div>
        {viewMode === 'list' && (
          <button onClick={handleAdd} className={styles.buttonPrimary}>
            <Plus size={16} strokeWidth={2.5} />
            Add Property
          </button>
        )}
      </header>

      {viewMode !== 'list' ? (
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <button
              onClick={resetForm}
              className={styles.buttonSecondary}
              style={{ padding: "0.25rem 0.5rem", marginBottom: "1rem" }}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <h2 className={styles.title} style={{ fontSize: "1.25rem" }}>
              Property Details
            </h2>
          </div>
          <form action={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Property Name</label>
              <input
                name="propertyName"
                className={styles.input}
                placeholder="e.g. Sunset Boulevard Apartment"
                defaultValue={editData?.property_name || ""}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Address</label>
              <textarea
                name="propertyAddress"
                className={styles.input}
                placeholder="Full address of the property"
                rows="3"
                defaultValue={editData?.property_address || ""}
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Property Type</label>
                <SearchableSelect
                  name="propertyType"
                  options={types}
                  value={selectedType?.name || ""}
                  onChange={(opt) => setSelectedType(opt)}
                  placeholder="Select Type"
                  submitId={true}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Status</label>
                <SearchableSelect
                  name="propertyStatus"
                  options={statuses}
                  value={selectedStatus?.name || ""}
                  onChange={(opt) => setSelectedStatus(opt)}
                  placeholder="Select Status"
                  submitId={true}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Country</label>
              <SearchableSelect
                name="country"
                options={countries}
                value={selectedCountry?.name || ""}
                onChange={(opt) => setSelectedCountry(opt)}
                placeholder="Search Country"
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>State / Province</label>
                <SearchableSelect
                  name="state"
                  options={states}
                  value={selectedState?.name || ""}
                  onChange={(opt) => setSelectedState(opt)}
                  placeholder="Search State"
                  disabled={!selectedCountry}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>City</label>
                <SearchableSelect
                  name="city"
                  options={cities}
                  value={selectedCity?.name || ""}
                  onChange={(opt) => setSelectedCity(opt)}
                  placeholder="Search City"
                  disabled={!selectedState}
                  required
                />
              </div>
            </div>

            {errorMsg && (
              <div style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "1rem" }}>
                {errorMsg}
              </div>
            )}

            <div className={styles.formActions}>
              <button
                type="button"
                onClick={resetForm}
                className={styles.buttonSecondary}
              >
                Cancel
              </button>
              <button type="submit" className={styles.buttonPrimary} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Saving...
                  </>
                ) : (
                  viewMode === 'edit' ? "Save Changes" : "Create Property"
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          {initialProperties.length === 0 ? (
            <div className={styles.emptyState}>
              <Building size={48} className={styles.emptyIcon} strokeWidth={1.5} />
              <h3 className={styles.emptyText}>No properties found</h3>
              <p className={styles.emptySubText}>
                Get started by adding your first property to the system.
              </p>
              <button onClick={handleAdd} className={styles.buttonPrimary} style={{ marginTop: "1.5rem" }}>
                <Plus size={16} /> Add Property
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {initialProperties.map((prop) => (
                <div key={prop.property_id || prop.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.propertyName}>{prop.property_name}</h3>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                        <MapPin size={14} color="#71717a" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: "0.8125rem", color: "#71717a" }}>
                          {prop.property_address}
                        </span>
                      </div>
                      <p className={styles.propertyAddress}>
                        {prop.city}, {prop.state}
                      </p>

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                        {prop.property_type_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#18181b', background: '#f4f4f5', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>
                            <Building size={12} /> {prop.property_type_name}
                          </div>
                        )}
                        {prop.property_status_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#18181b', background: '#f4f4f5', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>
                            <Info size={12} /> {prop.property_status_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleEdit(prop)}
                        title="Edit Property"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#a1a1aa' }}
                      >
                        <Edit2 size={18} strokeWidth={2} />
                      </button>
                      <div className={styles.cardIcon}>
                        <Building size={20} strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "1.25rem", borderTop: "1px solid #f4f4f5", paddingTop: "1rem" }}>
                    {prop.accounts && prop.accounts.map((acc, idx) => (
                      <div key={idx} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.75rem",
                        marginBottom: "0.4rem"
                      }}>
                        <span style={{ fontWeight: 600, color: "#18181b", width: "40px" }}>
                          {acc.currency_code}
                        </span>
                        <div style={{ display: "flex", gap: "0.75rem" }}>
                          <span style={{ color: "#71717a" }}>
                            Inc: <span style={{ color: "#18181b", fontWeight: 500 }}>{Number(acc.income).toLocaleString()}</span>
                          </span>
                          <span style={{ color: "#71717a" }}>
                            Exp: <span style={{ color: "#18181b", fontWeight: 500 }}>{Number(acc.expense).toLocaleString()}</span>
                          </span>
                          <span style={{ color: "#71717a" }}>
                            Prf: <span style={{ color: "#10b981", fontWeight: 600 }}>{Number(acc.profit).toLocaleString()}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.cardFooter}>
                    <span>{prop.country}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
