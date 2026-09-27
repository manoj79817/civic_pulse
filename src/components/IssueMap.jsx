import React, { useEffect, useRef, useState } from 'react';
import './IssueMap.css';
import { dbService } from '../api/db';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { civicIssues } from '../constants/civicIssues';

const IssueMap = ({ reports }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const [markers, setMarkers] = useState([]);
    const popupRef = useRef(null);

    // Default center: Guntur, AP
    const defaultCenter = [16.3067, 80.4365];

    useEffect(() => {
        if (mapInstanceRef.current || !mapRef.current) return;

        const map = L.map(mapRef.current, {
            center: defaultCenter,
            zoom: 10,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;

        // Try to center on user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = [position.coords.latitude, position.coords.longitude];
                    map.setView(pos, 14);

                    // Add "You are here" marker
                    const userIcon = L.divIcon({
                        html: `<div style="width:16px;height:16px;background:#2962FF;border:3px solid white;border-radius:50%;box-shadow:0 0 6px rgba(41,98,255,0.5);"></div>`,
                        className: 'user-location-icon',
                        iconSize: [16, 16],
                        iconAnchor: [8, 8],
                    });
                    L.marker(pos, { icon: userIcon, zIndexOffset: 999 })
                        .addTo(map)
                        .bindTooltip('You are here');
                },
                () => {
                    console.log("Error: The Geolocation service failed.");
                }
            );
        }

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    // Add report markers
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !reports.length) return;

        console.log(`IssueMap: Received ${reports.length} reports`);

        // Clear old markers
        markers.forEach(m => map.removeLayer(m));
        const newMarkers = [];

        reports.forEach(report => {
            let lat, lng;

            if (report.lat && report.lng) {
                lat = parseFloat(report.lat);
                lng = parseFloat(report.lng);
            } else if (report.coords) {
                try {
                    const c = typeof report.coords === 'string' ? JSON.parse(report.coords) : report.coords;
                    lat = parseFloat(c.lat);
                    lng = parseFloat(c.lng);
                } catch (e) { }
            }

            if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                console.warn("Invalid coords for report:", report.$id);
                return;
            }

            // Find issue type for color
            let issueType = null;
            if (report.issueTypeId) {
                issueType = civicIssues.find(i => String(i.id) === String(report.issueTypeId));
            }

            if (!issueType) {
                issueType = civicIssues.find(i => i.title === report.issueTitle);
            }

            const color = issueType ? issueType.color : '#3b82f6';
            const markerColor = getMarkerColor(color);

            // Create circle marker
            const circleMarker = L.circleMarker([lat, lng], {
                radius: 8,
                fillColor: markerColor,
                fillOpacity: 1,
                color: '#ffffff',
                weight: 2,
            }).addTo(map);

            // Build popup content
            const imageUrl = dbService.getImageUrl(report.imageId);
            const status = (report.status || 'open').toLowerCase();
            let statusColor = '#ef4444';
            let statusLabel = 'Open';

            if (status.includes('progress') || status === 'wip') {
                statusColor = '#f59e0b';
                statusLabel = 'In Progress';
            } else if (status === 'resolved') {
                statusColor = '#10b981';
                statusLabel = 'Resolved';
            }

            const contentString = `
                <div class="map-info-window" style="font-family: 'Outfit', sans-serif;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <h3 style="margin:0; font-size:16px; color:#1e293b;">${report.issueTitle || 'Issue'}</h3>
                        <span style="background-color:${statusColor}; color:white; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:600; text-transform:uppercase;">${statusLabel}</span>
                    </div>
                    ${imageUrl ? `<img src="${imageUrl}" alt="Issue" style="width:100%; max-height:150px; object-fit:cover; border-radius:6px; margin-bottom:8px;">` : ''}
                    <p style="margin:0 0 8px 0; font-size:13px; color:#475569; line-height:1.4;">${report.description || ''}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1px solid #e2e8f0; padding-top:8px;">
                        <small style="color:#94a3b8;">${new Date(report.$createdAt).toLocaleDateString()}</small>
                        <a href="/issue/${report.$id}" style="color:#2563eb; text-decoration:none; font-size:13px; font-weight:500;">View Details →</a>
                    </div>
                </div>
            `;

            circleMarker.bindPopup(contentString, { maxWidth: 300, minWidth: 200 });
            newMarkers.push(circleMarker);
        });

        setMarkers(newMarkers);

    }, [reports]);

    const getMarkerColor = (color) => {
        if (!color) return '#3b82f6';
        if (color.startsWith('#')) return color;

        if (color.includes('primary-dark')) return '#1e3a8a';
        if (color.includes('primary')) return '#3b82f6';
        if (color.includes('secondary-dark')) return '#b45309';
        if (color.includes('secondary')) return '#f59e0b';
        if (color.includes('accent')) return '#ef4444';
        return '#3b82f6';
    };

    return (
        <div className="issue-map-container">
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
};

export default IssueMap;
