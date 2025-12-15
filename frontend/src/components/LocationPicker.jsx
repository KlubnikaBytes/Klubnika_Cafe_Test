import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete } from '@react-google-maps/api';
import haversine from 'haversine';

const LIBRARIES = ['places'];
const GOOGLE_MAPS_API_KEY = 'AIzaSyAi6M7uG1Q6fxE_s8kudSIRRTKJTTrR2Yk';

// Cafe Coordinates
// Updated Cafe Coordinates
const CAFE_LOCATION = { lat: 22.7339544, lng: 87.5219511 };
const MAX_DISTANCE_KM = 1000;

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const LocationPicker = ({ onLocationSelect }) => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [selectedPos, setSelectedPos] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isWithinRange, setIsWithinRange] = useState(false);

  const searchResultRef = useRef(null);

  const extractAddressDetails = (components) => {
    let city = '';
    let state = '';
    let pincode = '';
    let area = '';

    components.forEach((component) => {
      const types = component.types;

      if (types.includes('postal_code')) pincode = component.long_name;
      if (types.includes('locality')) city = component.long_name;
      if (!city && types.includes('administrative_area_level_2')) city = component.long_name;
      if (types.includes('administrative_area_level_1')) state = component.long_name;
      if (
        types.includes('sublocality') ||
        types.includes('sublocality_level_1') ||
        types.includes('neighborhood') ||
        types.includes('route')
      ) {
        area = component.long_name;
      }
    });

    return { city, state, pincode, area };
  };

  const processLocation = async (lat, lng) => {
    const coords = { lat, lng };
    const dist = haversine(
      { latitude: CAFE_LOCATION.lat, longitude: CAFE_LOCATION.lng },
      { latitude: lat, longitude: lng },
      { unit: 'km' }
    );
    const inRange = dist <= MAX_DISTANCE_KM;

    const geocoder = new window.google.maps.Geocoder();
    const response = await geocoder.geocode({ location: coords });

    let addressData = { city: '', state: '', pincode: '', area: '' };

    if (response.results && response.results[0]) {
      const result = response.results[0];
      addressData = extractAddressDetails(result.address_components);
    }

    setSelectedPos(coords);
    setDistance(dist);
    setIsWithinRange(inRange);

    onLocationSelect(coords, inRange, addressData);
  };

  const onPlaceChanged = () => {
    const place = searchResultRef.current.getPlace();
    if (place.geometry) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      map.panTo({ lat, lng });
      map.setZoom(15);
      processLocation(lat, lng);
    }
  };

  if (!isLoaded) return <div className="text-white">Loading Map...</div>;

  return (
    <div className="text-white mb-6">
      <h3 className="text-xl font-semibold mb-3">1. Select Location on Map</h3>

      <div className="h-80 w-full rounded-xl overflow-hidden border border-gray-500 relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={CAFE_LOCATION}
          zoom={13}
          onLoad={(m) => setMap(m)}
          onClick={(e) => processLocation(e.latLng.lat(), e.latLng.lng())}
        >
          <Marker position={CAFE_LOCATION} label="C" />
          {selectedPos && <Marker position={selectedPos} />}
        </GoogleMap>

        <div className="absolute top-2 left-0 w-full flex justify-center px-4">
          <Autocomplete onLoad={(a) => (searchResultRef.current = a)} onPlaceChanged={onPlaceChanged}>
            <input
              type="text"
              placeholder="Search your location…"
              className="
                w-full max-w-lg px-5 py-3 
                bg-white/95
                rounded-full 
                shadow-xl
                text-gray-800
                border border-gray-300
                focus:outline-none
                focus:ring-2 focus:ring-blue-500
                placeholder-gray-500
                transition-all duration-200"
            />
          </Autocomplete>
        </div>
      </div>

      {distance !== null && (
        <div
          className={`mt-3 p-3 rounded text-center font-bold ${isWithinRange ? 'bg-green-600' : 'bg-red-600'
            }`}
        >
          {distance.toFixed(1)} km Away — {isWithinRange ? 'Within Range' : 'Outside Delivery Range'}
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
