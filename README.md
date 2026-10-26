# Helios Hub v11 - Architecture and Deployment Guide

## Overview
Helios Hub v11 is an upgraded full-stack digital hub for Grade 8 students featuring real-time messaging, daily Officer of the Day (OD) rotation, 365-day schedule management, subject-scoped curriculum properties, digital library asset management with 50MB storage validation, and an interactive profile avatar positioner.

## Key Upgrades in v11:
1. **Registered Users Database Check**: Sign-in strictly validates against the registered user database (`profiles` and `registered_users` tables in Supabase / local registry).
2. **Exclusive Circle of Friends Group Chat**: In Messaging, users only see their own assigned Circle of Friends group chat (plus Section GC and Direct Messages).
3. **Real-Time Messages**: Integrated Supabase Realtime channel subscription + 2s polling fallback for instant cross-device updates.
4. **Subject-Scoped Class Properties**: Properties added under a class (e.g., Science) remain strictly under that class.
5. **Mobile Responsive Glassmorphism Design**: Mobile navbar drawer with zero horizontal scroll overflow.
