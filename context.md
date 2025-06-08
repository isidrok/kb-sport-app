# Development Context

## Current Task: Video Recording Setting with Storage Quota Check

### Objective
Add a setting to disable video recording that:
- Is disabled by default unless storage quota > 1GB
- Shows appropriate message when disabled (device not supported or insufficient space)
- Integrates with existing recording and storage services

### Task Plan
- [ ] **Task 1**: Explore current recording and storage implementation
  - Check recording.service.ts for current recording logic
  - Check storage.service.ts for storage operations
  - Identify existing settings/configuration structure
  
- [ ] **Task 2**: Check current settings/configuration structure
  - Look for existing UI settings implementation
  - Understand how settings are managed and persisted
  
- [ ] **Task 3**: Implement storage quota checking utility
  - Create utility to check available storage quota
  - Add logic to determine if >1GB available
  
- [ ] **Task 4**: Add video recording setting with conditional enabling
  - Add recording setting to configuration
  - Implement logic to enable/disable based on storage quota
  
- [ ] **Task 5**: Update UI to show appropriate message when disabled
  - Add checkbox/toggle for video recording setting
  - Display contextual message when disabled
  - Integrate with existing UI components

### Progress Tracking
🔄 Currently working on: Task 1 - Exploring current implementation
