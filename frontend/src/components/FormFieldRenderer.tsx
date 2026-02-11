'use client';

import { FormField, FieldType } from '@/types';
import { ChangeEvent, useMemo } from 'react';
import { countries, states, cities, getStatesByCountry, getCitiesByState } from '@/lib/worldCities';

// List of countries
const COUNTRIES = [
  { label: "United States", value: "US" },
  { label: "United Kingdom", value: "GB" },
  { label: "Canada", value: "CA" },
  { label: "Australia", value: "AU" },
  { label: "India", value: "IN" },
  { label: "China", value: "CN" },
  { label: "Germany", value: "DE" },
  { label: "France", value: "FR" },
  { label: "Japan", value: "JP" },
  { label: "South Korea", value: "KR" },
  { label: "Singapore", value: "SG" },
  { label: "Netherlands", value: "NL" },
  { label: "Sweden", value: "SE" },
  { label: "Switzerland", value: "CH" },
  { label: "New Zealand", value: "NZ" },
  { label: "Ireland", value: "IE" },
  { label: "Spain", value: "ES" },
  { label: "Italy", value: "IT" },
  { label: "Brazil", value: "BR" },
  { label: "Mexico", value: "MX" },
  { label: "Argentina", value: "AR" },
  { label: "South Africa", value: "ZA" },
  { label: "United Arab Emirates", value: "AE" },
  { label: "Saudi Arabia", value: "SA" },
  { label: "Pakistan", value: "PK" },
  { label: "Bangladesh", value: "BD" },
  { label: "Nepal", value: "NP" },
  { label: "Sri Lanka", value: "LK" },
  { label: "Malaysia", value: "MY" },
  { label: "Thailand", value: "TH" },
  { label: "Indonesia", value: "ID" },
  { label: "Philippines", value: "PH" },
  { label: "Vietnam", value: "VN" },
  { label: "Afghanistan", value: "AF" },
  { label: "Albania", value: "AL" },
  { label: "Algeria", value: "DZ" },
  { label: "Andorra", value: "AD" },
  { label: "Angola", value: "AO" },
  { label: "Antigua and Barbuda", value: "AG" },
  { label: "Armenia", value: "AM" },
  { label: "Austria", value: "AT" },
  { label: "Azerbaijan", value: "AZ" },
  { label: "Bahamas", value: "BS" },
  { label: "Bahrain", value: "BH" },
  { label: "Barbados", value: "BB" },
  { label: "Belarus", value: "BY" },
  { label: "Belgium", value: "BE" },
  { label: "Belize", value: "BZ" },
  { label: "Benin", value: "BJ" },
  { label: "Bhutan", value: "BT" },
  { label: "Bolivia", value: "BO" },
  { label: "Bosnia and Herzegovina", value: "BA" },
  { label: "Botswana", value: "BW" },
  { label: "Brunei", value: "BN" },
  { label: "Bulgaria", value: "BG" },
  { label: "Burkina Faso", value: "BF" },
  { label: "Burundi", value: "BI" },
  { label: "Cambodia", value: "KH" },
  { label: "Cameroon", value: "CM" },
  { label: "Cape Verde", value: "CV" },
  { label: "Central African Republic", value: "CF" },
  { label: "Chad", value: "TD" },
  { label: "Chile", value: "CL" },
  { label: "Colombia", value: "CO" },
  { label: "Comoros", value: "KM" },
  { label: "Congo", value: "CG" },
  { label: "Costa Rica", value: "CR" },
  { label: "Croatia", value: "HR" },
  { label: "Cuba", value: "CU" },
  { label: "Cyprus", value: "CY" },
  { label: "Czech Republic", value: "CZ" },
  { label: "Denmark", value: "DK" },
  { label: "Djibouti", value: "DJ" },
  { label: "Dominica", value: "DM" },
  { label: "Dominican Republic", value: "DO" },
  { label: "Ecuador", value: "EC" },
  { label: "Egypt", value: "EG" },
  { label: "El Salvador", value: "SV" },
  { label: "Equatorial Guinea", value: "GQ" },
  { label: "Eritrea", value: "ER" },
  { label: "Estonia", value: "EE" },
  { label: "Ethiopia", value: "ET" },
  { label: "Fiji", value: "FJ" },
  { label: "Finland", value: "FI" },
  { label: "Gabon", value: "GA" },
  { label: "Gambia", value: "GM" },
  { label: "Georgia", value: "GE" },
  { label: "Ghana", value: "GH" },
  { label: "Greece", value: "GR" },
  { label: "Grenada", value: "GD" },
  { label: "Guatemala", value: "GT" },
  { label: "Guinea", value: "GN" },
  { label: "Guinea-Bissau", value: "GW" },
  { label: "Guyana", value: "GY" },
  { label: "Haiti", value: "HT" },
  { label: "Honduras", value: "HN" },
  { label: "Hungary", value: "HU" },
  { label: "Iceland", value: "IS" },
  { label: "Iran", value: "IR" },
  { label: "Iraq", value: "IQ" },
  { label: "Israel", value: "IL" },
  { label: "Jamaica", value: "JM" },
  { label: "Jordan", value: "JO" },
  { label: "Kazakhstan", value: "KZ" },
  { label: "Kenya", value: "KE" },
  { label: "Kiribati", value: "KI" },
  { label: "Kuwait", value: "KW" },
  { label: "Kyrgyzstan", value: "KG" },
  { label: "Laos", value: "LA" },
  { label: "Latvia", value: "LV" },
  { label: "Lebanon", value: "LB" },
  { label: "Lesotho", value: "LS" },
  { label: "Liberia", value: "LR" },
  { label: "Libya", value: "LY" },
  { label: "Liechtenstein", value: "LI" },
  { label: "Lithuania", value: "LT" },
  { label: "Luxembourg", value: "LU" },
  { label: "Madagascar", value: "MG" },
  { label: "Malawi", value: "MW" },
  { label: "Maldives", value: "MV" },
  { label: "Mali", value: "ML" },
  { label: "Malta", value: "MT" },
  { label: "Marshall Islands", value: "MH" },
  { label: "Mauritania", value: "MR" },
  { label: "Mauritius", value: "MU" },
  { label: "Micronesia", value: "FM" },
  { label: "Moldova", value: "MD" },
  { label: "Monaco", value: "MC" },
  { label: "Mongolia", value: "MN" },
  { label: "Montenegro", value: "ME" },
  { label: "Morocco", value: "MA" },
  { label: "Mozambique", value: "MZ" },
  { label: "Myanmar", value: "MM" },
  { label: "Namibia", value: "NA" },
  { label: "Nauru", value: "NR" },
  { label: "Nicaragua", value: "NI" },
  { label: "Niger", value: "NE" },
  { label: "Nigeria", value: "NG" },
  { label: "North Macedonia", value: "MK" },
  { label: "Norway", value: "NO" },
  { label: "Oman", value: "OM" },
  { label: "Palau", value: "PW" },
  { label: "Palestine", value: "PS" },
  { label: "Panama", value: "PA" },
  { label: "Papua New Guinea", value: "PG" },
  { label: "Paraguay", value: "PY" },
  { label: "Peru", value: "PE" },
  { label: "Poland", value: "PL" },
  { label: "Portugal", value: "PT" },
  { label: "Qatar", value: "QA" },
  { label: "Romania", value: "RO" },
  { label: "Russia", value: "RU" },
  { label: "Rwanda", value: "RW" },
  { label: "Saint Kitts and Nevis", value: "KN" },
  { label: "Saint Lucia", value: "LC" },
  { label: "Saint Vincent and the Grenadines", value: "VC" },
  { label: "Samoa", value: "WS" },
  { label: "San Marino", value: "SM" },
  { label: "Sao Tome and Principe", value: "ST" },
  { label: "Senegal", value: "SN" },
  { label: "Serbia", value: "RS" },
  { label: "Seychelles", value: "SC" },
  { label: "Sierra Leone", value: "SL" },
  { label: "Slovakia", value: "SK" },
  { label: "Slovenia", value: "SI" },
  { label: "Solomon Islands", value: "SB" },
  { label: "Somalia", value: "SO" },
  { label: "South Sudan", value: "SS" },
  { label: "Sudan", value: "SD" },
  { label: "Suriname", value: "SR" },
  { label: "Swaziland", value: "SZ" },
  { label: "Syria", value: "SY" },
  { label: "Taiwan", value: "TW" },
  { label: "Tajikistan", value: "TJ" },
  { label: "Tanzania", value: "TZ" },
  { label: "Togo", value: "TG" },
  { label: "Tonga", value: "TO" },
  { label: "Trinidad and Tobago", value: "TT" },
  { label: "Tunisia", value: "TN" },
  { label: "Turkey", value: "TR" },
  { label: "Turkmenistan", value: "TM" },
  { label: "Tuvalu", value: "TV" },
  { label: "Uganda", value: "UG" },
  { label: "Ukraine", value: "UA" },
  { label: "Uruguay", value: "UY" },
  { label: "Uzbekistan", value: "UZ" },
  { label: "Vanuatu", value: "VU" },
  { label: "Vatican City", value: "VA" },
  { label: "Venezuela", value: "VE" },
  { label: "Yemen", value: "YE" },
  { label: "Zambia", value: "ZM" },
  { label: "Zimbabwe", value: "ZW" },
];

interface FormFieldRendererProps {
  field: FormField;
  value: any;
  onChange: (key: string, value: any) => void;
  error?: string;
  allValues?: any; // All form values for cascading dropdowns
  isAdminEdit?: boolean; // If true, email field should be read-only
  readOnly?: boolean; // If true, all fields are disabled/read-only
}

export default function FormFieldRenderer({
  field,
  value,
  onChange,
  error,
  allValues = {},
  isAdminEdit = false,
  readOnly = false,
}: FormFieldRendererProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (readOnly) return; // Don't allow changes in read-only mode
    const newValue = field.type === FieldType.CHECKBOX 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value;
    onChange(field.key, newValue);
  };

  const baseInputClasses = `w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 font-medium bg-white ${
    error ? 'border-red-500 bg-red-50' : 'border-gray-300'
  } ${readOnly ? 'cursor-not-allowed bg-gray-100' : ''}`;

  const renderField = () => {
    switch (field.type) {
      case FieldType.TEXT:
      case FieldType.EMAIL:
      case FieldType.PHONE:
        return (
          <input
            type={field.type === FieldType.EMAIL ? 'email' : field.type === FieldType.PHONE ? 'tel' : 'text'}
            id={field.key}
            value={value || ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            disabled={readOnly}
            className={baseInputClasses}
          />
        );

      case FieldType.NUMBER:
        return (
          <input
            type="number"
            id={field.key}
            value={value || ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            disabled={readOnly}
            min={field.validation?.min}
            max={field.validation?.max}
            step="0.1"
            className={baseInputClasses}
          />
        );

      case FieldType.DATE:
        return (
          <input
            type="date"
            id={field.key}
            value={value || ''}
            onChange={handleChange}
            required={field.required}
            disabled={readOnly}
            className={baseInputClasses}
          />
        );

      case FieldType.TEXTAREA:
        return (
          <textarea
            id={field.key}
            value={value || ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            disabled={readOnly}
            rows={4}
            className={baseInputClasses}
          />
        );

      case FieldType.SELECT: {
        // Handle Country dropdown - Show all countries
        if (field.key.includes('Country')) {
          const countryOptions = countries.map((c) => ({ label: c.name, value: c.code }));
          // Use defaultValue if value is empty or undefined
          const currentValue = (value && value.trim() !== '') ? value : (field.defaultValue || '');
          
          return (
            <select
              id={field.key}
              value={currentValue}
              onChange={handleChange}
              required={field.required}
              disabled={readOnly}
              className={baseInputClasses}
            >
              <option value="">Select {field.label}</option>
              {countryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        }
        
        // Handle State dropdown - Show all states from all countries
        if (field.key.includes('State')) {
          // Get all states and sort alphabetically with unique keys
          const allStates = states
            .map((s) => ({ 
              label: `${s.name} (${s.countryCode})`, 
              value: s.code,
              uniqueKey: `${s.countryCode}-${s.code}` // Unique key combining country and state
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
          
          return (
            <select
              id={field.key}
              value={value || ''}
              onChange={handleChange}
              required={field.required}
              disabled={readOnly}
              className={baseInputClasses}
            >
              <option value="">Select {field.label}</option>
              {allStates.map((option) => (
                <option key={option.uniqueKey} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        }
        
        // Handle City dropdown - Show all cities
        if (field.key.includes('City')) {
          // Get all cities and sort alphabetically
          const allCities = cities
            .map((c) => ({ label: `${c.name}, ${c.stateName}`, value: c.name }))
            .sort((a, b) => a.label.localeCompare(b.label));
          
          return (
            <select
              id={field.key}
              value={value || ''}
              onChange={handleChange}
              required={field.required}
              disabled={readOnly}
              className={baseInputClasses}
            >
              <option value="">Select {field.label}</option>
              {allCities.map((option, idx) => (
                <option key={`${option.value}-${idx}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        }
        
        // Regular select with predefined options
        const regularOptions = field.options || [];
        // Use defaultValue if value is empty or undefined
        const selectValue = (value && value.trim() !== '') ? value : (field.defaultValue || '');
        return (
          <select
            id={field.key}
            value={selectValue}
            onChange={handleChange}
            required={field.required}
            disabled={readOnly}
            className={baseInputClasses}
          >
            <option value="">Select {field.label}</option>
            {regularOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      }

      case FieldType.COUNTRY:
        // Use defaultValue if value is empty or undefined
        const countryValue = (value && value.trim() !== '') ? value : (field.defaultValue || '');
        return (
          <select
            id={field.key}
            value={countryValue}
            onChange={handleChange}
            required={field.required}
            disabled={readOnly}
            className={baseInputClasses}
          >
            <option value="">Select Country</option>
            {COUNTRIES.map((country) => (
              <option key={country.value} value={country.value}>
                {country.label}
              </option>
            ))}
          </select>
        );

      case FieldType.RADIO:
        return (
          <div className="flex flex-wrap gap-4">
            {field.options?.map((option) => (
              <label
                key={option.value}
                className={`flex items-center space-x-2 cursor-pointer group px-4 py-2 rounded-lg border border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors ${readOnly ? 'cursor-not-allowed opacity-75' : ''}`}
              >
                <input
                  type="radio"
                  name={field.key}
                  value={option.value}
                  checked={value === option.value}
                  onChange={handleChange}
                  required={field.required}
                  disabled={readOnly}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-900 text-sm font-medium group-hover:text-blue-600">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        );

      case FieldType.CHECKBOX:
        return (
          <label className={`flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 ${readOnly ? 'cursor-not-allowed opacity-75' : ''}`}>
            <input
              type="checkbox"
              id={field.key}
              checked={value || false}
              onChange={handleChange}
              disabled={readOnly}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-900 font-medium">{field.label}</span>
          </label>
        );

      case FieldType.FILE:
        return (
          <div className="space-y-2">
            <input
              type="file"
              id={field.key}
              onChange={(e) => {
                if (readOnly) return;
                const file = e.target.files?.[0];
                onChange(field.key, file);
              }}
              required={field.required}
              disabled={readOnly}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${readOnly ? 'cursor-not-allowed bg-gray-100' : ''}`}
            />
            {value && (
              <p className="text-sm text-gray-600">
                Selected: {value.name || 'File uploaded'}
              </p>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            id={field.key}
            value={value || ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            required={field.required}
            disabled={readOnly}
            className={baseInputClasses}
          />
        );
    }
  };

  // For checkbox, render differently
  if (field.type === FieldType.CHECKBOX) {
    return (
      <div className="mb-5">
        {renderField()}
        {field.helpText && (
          <p className="text-sm text-gray-600 mt-2 ml-8">{field.helpText}</p>
        )}
        {error && <p className="text-sm text-red-600 mt-2 ml-8 font-medium">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mb-5">
      <label htmlFor={field.key} className="block text-sm font-semibold text-gray-900 mb-2">
        {field.label}
        {field.required && <span className="text-red-600 ml-1 font-bold">*</span>}
      </label>
      {renderField()}
      {field.helpText && (
        <p className="text-sm text-gray-600 mt-2">{field.helpText}</p>
      )}
      {error && <p className="text-sm text-red-600 mt-2 font-medium">{error}</p>}
    </div>
  );
}


