# Implementation Plan: notifications

**Branch**: `XXX-notifications` | **Date**: 2026-01-28 | **Spec**: specs/master/spec.md
**Input**: Feature specification from `/specs/master/spec.md`

## Summary

Add a notifications system with per-user preferences, realtime delivery via socket.io, and UI pages for listing and settings. Use existing Prisma DB, server emitter helper, and navbar badge.

## Technical Context

**Language/Version**: TypeScript (Node.js runtime)
**Primary Dependencies**: React, Remix-style routing, Prisma, Socket.IO, Tailwind
**Storage**: PostgreSQL via Prisma
**Testing**: vitest/playwright for e2e
**Target Platform**: Web (server + client)
**Project Type**: Web application (single repo)

## Project Structure

specs/master/
- plan.md
- research.md (optional)
- data-model.md (optional)
- quickstart.md (optional)
- tasks.md (created from template)

## Status: ⚠️ BLOCKED until tasks.md is added and checklists reviewed
