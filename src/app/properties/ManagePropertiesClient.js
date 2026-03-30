"use client";

import { useState, useTransition, useEffect } from "react";
import { Plus, Building, MapPin, Loader2, ArrowLeft, Edit2, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./properties.module.css";
import {
  createProperty,
  updateProperty,
  getPropertyTypes,
  getPropertyStatuses,
} from "@/actions/property-actions";
import { getCountries, getStates, getCities } from "@/actions/location-actions";
import SearchableSelect from "@/components/ui/SearchableSelect";
import MetaBadge from "@/components/ui/MetaBadge";

export default function ManagePropertiesClient({ initialProperties }) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState("list"); // 'list' | 'add' | 'edit'
  const [editData, setEditData] = useState(null);

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [types, setTypes] = useState([]);
  const [statuses, setStatuses] = useState([]);

  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);

  useEffect(() => {
    if (viewMode !== "list") {
      getCountries().then(setCountries);
      getPropertyTypes().then(setTypes);
      getPropertyStatuses().then(setStatuses);
    }
  }, [viewMode]);

  useEffect(() => {
    if (selectedCountry?.id) {
      getStates(selectedCountry.id).then((res) => {
        setStates(res);
        if (
          viewMode === "add" ||
          (viewMode === "edit" && editData?.country !== selectedCountry.name)
        ) {
          setSelectedState(null);
          setSelectedCity(null);
          setCities([]);
        }
      });
    } else {
      setStates([]);
    }
  }, [selectedCountry?.id, viewMode, editData]);

  useEffect(() => {
    if (selectedState?.id) {
      getCities(selectedState.id).then((res) => {
        setCities(res);
        if (
          viewMode === "add" ||
          (viewMode === "edit" && editData?.state !== selectedState.name)
        ) {
          setSelectedCity(null);
        }
      });
    } else {
      setCities([]);
    }
  }, [selectedState?.id, viewMode, editData]);

  useEffect(() => {
    if (viewMode === "edit" && editData && countries.length > 0 && !selectedCountry) {
      const match = countries.find((c) => c.name === editData.country);
      if (match) setSelectedCountry(match);
    }
  }, [viewMode, editData, countries, selectedCountry]);

  useEffect(() => {
    if (viewMode === "edit" && editData && states.length > 0 && !selectedState) {
      const match = states.find((s) => s.name === editData.state);
      if (match) setSelectedState(match);
    }
  }, [viewMode, editData, states, selectedState]);

  useEffect(() => {
    if (viewMode === "edit" && editData && cities.length > 0 && !selectedCity) {
      const match = cities.find((c) => c.name === editData.city);
      if (match) setSelectedCity(match);
    }
  }, [viewMode, editData, cities, selectedCity]);

  useEffect(() => {
    if (
      viewMode === "edit" &&
      editData &&
      types.length > 0 &&
      !selectedType &&
      editData.property_type_name
    ) {
      const match = types.find((t) => t.name === editData.property_type_name);
      if (match) setSelectedType(match);
    }
  }, [viewMode, editData, types, selectedType]);

  useEffect(() => {
    if (
      viewMode === "edit" &&
      editData &&
      statuses.length > 0 &&
      !selectedStatus &&
      editData.property_status_name
    ) {
      const match = statuses.find((s) => s.name === editData.property_status_name);
      if (match) setSelectedStatus(match);
    }
  }, [viewMode, editData, statuses, selectedStatus]);

  function resetForm() {
    setViewMode("list");
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
    setViewMode("add");
  }

  function handleEdit(prop) {
    resetForm();
    setEditData(prop);
    setViewMode("edit");
  }

  async function handleSubmit(formData) {
    setErrorMsg("");
    startTransition(async () => {
      const res =
        viewMode === "edit"
          ? await updateProperty(editData.property_id, formData)
          : await createProperty(formData);

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        resetForm();
        router.refresh();
      }
    });
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {viewMode === "list" && "Manage Properties"}
            {viewMode === "add" && "Add Property"}
            {viewMode === "edit" && "Edit Property"}
          </h1>
          <p className={styles.subtitle}>
            {viewMode === "list" && "View and manage your real estate assets."}
            {viewMode === "add" && "Add a new property to your portfolio."}
            {viewMode === "edit" && "Update property details and location."}
          </p>
        </div>
        {viewMode === "list" && (
          <button onClick={handleAdd} className={styles.buttonPrimary}>
            <Plus size={16} strokeWidth={2.5} /> Add Property
          </button>
        )}
      </header>

      {viewMode !== "list" ? (
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            {/* FIX: removed inline style={{ padding, marginBottom }} */}
            <button onClick={resetForm} className={`${styles.buttonSecondary} ${styles.backBtn}`}>
              <ArrowLeft size={16} /> Back
            </button>
            <h2 className={styles.formHeading}>Property Details</h2>
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

            {/* FIX: was inline style color:"#ef4444" with no background — now uses shared errorBox class */}
            {errorMsg && <div className={styles.errorBox}>{errorMsg}</div>}

            <div className={styles.formActions}>
              <button type="button" onClick={resetForm} className={styles.buttonSecondary}>
                Cancel
              </button>
              <button type="submit" className={styles.buttonPrimary} disabled={isPending}>
                {isPending ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : viewMode === "edit" ? (
                  "Save Changes"
                ) : (
                  "Create Property"
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
              <button onClick={handleAdd} className={`${styles.buttonPrimary} ${styles.emptyAction}`}>
                <Plus size={16} /> Add Property
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {initialProperties.map((prop) => (
                <div key={prop.property_id || prop.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardInfo}>
                      <h3 className={styles.propertyName}>{prop.property_name}</h3>

                      {/* FIX: was inline style color:"#71717a" — use CSS class */}
                      <div className={styles.propertyAddressRow}>
                        <MapPin size={14} className={styles.addressIcon} />
                        <span className={styles.addressText}>{prop.property_address}</span>
                      </div>
                      <p className={styles.propertyAddress}>
                        {prop.city}, {prop.state}
                      </p>

                      {/* FIX: type/status chips were inline style color:"#18181b", background:"#f4f4f5"
                          — light chips on dark card; now MetaBadge component */}
                      <div className={styles.propTags}>
                        {prop.property_type_name && (
                          <MetaBadge variant="default" icon={<Building size={12} />}>
                            {prop.property_type_name}
                          </MetaBadge>
                        )}
                        {prop.property_status_name && (
                          <MetaBadge variant="default" icon={<Info size={12} />}>
                            {prop.property_status_name}
                          </MetaBadge>
                        )}
                      </div>
                    </div>

                    {/* FIX: edit button was inline style background:'transparent', border:'none' */}
                    <div className={styles.cardActions}>
                      <button
                        onClick={() => handleEdit(prop)}
                        title="Edit Property"
                        className={styles.editBtn}
                      >
                        <Edit2 size={18} strokeWidth={2} />
                      </button>
                      <div className={styles.cardIcon}>
                        <Building size={20} strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>

                  {/* Account rows — FIX: all inline styles replaced */}
                  {prop.accounts && prop.accounts.length > 0 && (
                    <div className={styles.accountsSection}>
                      {prop.accounts.map((acc, idx) => (
                        <div key={idx} className={styles.accountRow}>
                          <span className={styles.accountCurrency}>{acc.currency_code}</span>
                          <div className={styles.accountFigures}>
                            <span className={styles.accountFigure}>
                              Inc: <span className={styles.accountValue}>{Number(acc.income).toLocaleString()}</span>
                            </span>
                            <span className={styles.accountFigure}>
                              Exp: <span className={styles.accountValue}>{Number(acc.expense).toLocaleString()}</span>
                            </span>
                            <span className={styles.accountFigure}>
                              Prf: <span className={styles.accountProfit}>{Number(acc.profit).toLocaleString()}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

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
