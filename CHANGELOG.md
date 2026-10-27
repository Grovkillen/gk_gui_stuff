# Changelog

All notable changes to GK GUI Stuff are documented in this file.

## 1.01.000 (2026-10-27)

### Added

* Module Filled badges: Redmine's status badges (such as Open, Locked, Closed, ON and OFF) are filled with their own colour and white text on every page, Redmine's and the GK plugins'. Off in a new installation: Redmine's outlined badges.

### Changed

* Settings pages: a section that already folds by itself (Redmine's collapsible box, a section with its own toggle, or one made of details) gets no second fold from the settings frame.
* This version is installed anew and does not upgrade an earlier one: uninstall the earlier version first (migrate it down to 0 while its own files are in place), then install this one. Nothing is carried over from the earlier installation.
* Administration > Functions lists the functions from the register in GK Records (1.04.000 or later) and switches them there, instead of keeping a register and a table of its own. Without GK Records no function is listed and all are off. The column On from the start is gone: every function is off until it is switched on.
* README: the requirements are the GK plugins required and optional, without a list of versions to install together.

### Fixed

* Administration > Features: the description is the widest column and wraps between words; the table no longer squeezes it to one letter per line in a narrow window, and scrolls sideways when it does not fit.
* Administration > Features: the ON/OFF badges stand in the middle of their row.
* The list filter field: the count and the clear button always stand inside the field, also on settings pages.
* The countdown on a notice that goes away by itself: the number stands in the middle of an even ring, at every width.
* The row menu never takes a reason field's buttons for the row's action.
* Administration, Functions: GK Core Stuff's looks are listed in the same table form as the plugins' functions, with a description of each and the same columns.
* Administration, Functions: ON is Redmine's outlined badge, as everywhere else; it is filled only with the module Filled badges.

## 1.00.000 (2026-10-24)

* First release.
