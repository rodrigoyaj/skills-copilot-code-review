document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const activitiesList = document.getElementById("activities-list");
  const messageDiv = document.getElementById("message");
  const registrationModal = document.getElementById("registration-modal");
  const modalActivityName = document.getElementById("modal-activity-name");
  const signupForm = document.getElementById("signup-form");
  const activityInput = document.getElementById("activity");
  const closeRegistrationModal = document.querySelector(".close-modal");

  // Search and filter elements
  const searchInput = document.getElementById("activity-search");
  const searchButton = document.getElementById("search-button");
  const categoryFilters = document.querySelectorAll(".category-filter");
  const dayFilters = document.querySelectorAll(".day-filter");
  const timeFilters = document.querySelectorAll(".time-filter");

  // Authentication elements
  const loginButton = document.getElementById("login-button");
  const userInfo = document.getElementById("user-info");
  const displayName = document.getElementById("display-name");
  const logoutButton = document.getElementById("logout-button");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const closeLoginModal = document.querySelector(".close-login-modal");
  const loginMessage = document.getElementById("login-message");

  // Announcement elements
  const announcementBanner = document.getElementById("announcement-banner");
  const manageAnnouncementsButton = document.getElementById(
    "manage-announcements-button"
  );
  const announcementsModal = document.getElementById("announcements-modal");
  const closeAnnouncementsButton = document.getElementById(
    "close-announcements-modal"
  );
  const announcementForm = document.getElementById("announcement-form");
  const announcementMessageInput = document.getElementById(
    "announcement-message"
  );
  const announcementStartDateInput = document.getElementById(
    "announcement-start-date"
  );
  const announcementExpirationDateInput = document.getElementById(
    "announcement-expiration-date"
  );
  const announcementEditorTitle = document.getElementById(
    "announcement-editor-title"
  );
  const saveAnnouncementButton = document.getElementById(
    "save-announcement-button"
  );
  const cancelAnnouncementEditButton = document.getElementById(
    "cancel-announcement-edit"
  );
  const announcementFormMessage = document.getElementById(
    "announcement-form-message"
  );
  const announcementList = document.getElementById("announcement-list");
  const announcementCount = document.getElementById("announcement-count");

  // Activity categories with corresponding colors
  const activityTypes = {
    sports: { label: "Sports", color: "#e8f5e9", textColor: "#2e7d32" },
    arts: { label: "Arts", color: "#f3e5f5", textColor: "#7b1fa2" },
    academic: { label: "Academic", color: "#e3f2fd", textColor: "#1565c0" },
    community: { label: "Community", color: "#fff3e0", textColor: "#e65100" },
    technology: { label: "Technology", color: "#e8eaf6", textColor: "#3949ab" },
  };

  // State for activities and filters
  let allActivities = {};
  let currentFilter = "all";
  let searchQuery = "";
  let currentDay = "";
  let currentTimeRange = "";

  // Authentication state
  let currentUser = null;
  let editingAnnouncementId = null;
  let announcementModalTrigger = null;

  // Time range mappings for the dropdown
  const timeRanges = {
    morning: { start: "06:00", end: "08:00" }, // Before school hours
    afternoon: { start: "15:00", end: "18:00" }, // After school hours
    weekend: { days: ["Saturday", "Sunday"] }, // Weekend days
  };

  // Initialize filters from active elements
  function initializeFilters() {
    // Initialize day filter
    const activeDayFilter = document.querySelector(".day-filter.active");
    if (activeDayFilter) {
      currentDay = activeDayFilter.dataset.day;
    }

    // Initialize time filter
    const activeTimeFilter = document.querySelector(".time-filter.active");
    if (activeTimeFilter) {
      currentTimeRange = activeTimeFilter.dataset.time;
    }
  }

  // Function to set day filter
  function setDayFilter(day) {
    currentDay = day;

    // Update active class
    dayFilters.forEach((btn) => {
      if (btn.dataset.day === day) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    fetchActivities();
  }

  // Function to set time range filter
  function setTimeRangeFilter(timeRange) {
    currentTimeRange = timeRange;

    // Update active class
    timeFilters.forEach((btn) => {
      if (btn.dataset.time === timeRange) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    fetchActivities();
  }

  function withSessionCredentials(options = {}) {
    return {
      credentials: "include",
      ...options,
    };
  }

  function clearAuthenticationState() {
    currentUser = null;
    updateAuthUI();
  }

  function handleAuthenticationFailure() {
    clearAuthenticationState();
    showMessage("Your session has ended. Please sign in again.", "info");
  }

  function handleAnnouncementAccessDenied() {
    closeAnnouncementsModal();
    showMessage("You do not have permission to manage announcements.", "error");
  }

  function canManageAnnouncements() {
    return currentUser && currentUser.role === "admin";
  }

  function getFocusableElements(container) {
    return Array.from(
      container.querySelectorAll(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(
      (element) =>
        !element.disabled &&
        !element.hasAttribute("hidden") &&
        !element.closest(".hidden")
    );
  }

  async function parseResponsePayload(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();
    return text ? { detail: text } : {};
  }

  // Check if the user already has a valid cookie-backed session
  function checkAuthentication() {
    validateUserSession();
    updateAuthBodyClass();
  }

  // Validate user session with the server
  async function validateUserSession() {
    try {
      const response = await fetch(
        "/auth/check-session",
        withSessionCredentials()
      );

      if (!response.ok) {
        clearAuthenticationState();
        return;
      }

      const userData = await response.json();
      currentUser = userData;
      updateAuthUI();
    } catch (error) {
      console.error("Error validating session:", error);
    }
  }

  // Update UI based on authentication state
  function updateAuthUI() {
    manageAnnouncementsButton.setAttribute(
      "aria-expanded",
      currentUser && !announcementsModal.classList.contains("hidden")
        ? "true"
        : "false"
    );

    if (currentUser) {
      loginButton.classList.add("hidden");
      userInfo.classList.remove("hidden");
      displayName.textContent = currentUser.display_name;
      manageAnnouncementsButton.classList.toggle(
        "hidden",
        !canManageAnnouncements()
      );
    } else {
      loginButton.classList.remove("hidden");
      userInfo.classList.add("hidden");
      displayName.textContent = "";
      manageAnnouncementsButton.classList.add("hidden");
    }

    updateAuthBodyClass();
    // Refresh the activities to update the UI
    fetchActivities();
  }

  // Update body class for CSS targeting
  function updateAuthBodyClass() {
    if (currentUser) {
      document.body.classList.remove("not-authenticated");
    } else {
      document.body.classList.add("not-authenticated");
    }
  }

  // Login function
  async function login(username, password) {
    try {
      const response = await fetch(
        "/auth/login",
        withSessionCredentials({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        })
      );

      const data = await response.json();

      if (!response.ok) {
        showLoginMessage(
          data.detail || "Invalid username or password",
          "error"
        );
        return false;
      }

      // Login successful
      currentUser = data;
      updateAuthUI();
      closeLoginModalHandler();
      showMessage(`Welcome, ${currentUser.display_name}!`, "success");
      return true;
    } catch (error) {
      console.error("Error during login:", error);
      showLoginMessage("Login failed. Please try again.", "error");
      return false;
    }
  }

  // Logout function
  async function logout(revokeSession = true) {
    if (revokeSession) {
      try {
        await fetch(
          "/auth/logout",
          withSessionCredentials({
            method: "POST",
          })
        );
      } catch (error) {
        console.error("Error revoking session:", error);
      }
    }

    clearAuthenticationState();
    showMessage("You have been logged out.", "info");
  }

  // Show message in login modal
  function showLoginMessage(text, type) {
    loginMessage.textContent = text;
    loginMessage.className = `message ${type}`;
    loginMessage.classList.remove("hidden");
  }

  // Open login modal
  function openLoginModal() {
    loginModal.classList.remove("hidden");
    loginModal.classList.add("show");
    loginMessage.classList.add("hidden");
    loginForm.reset();
  }

  // Close login modal
  function closeLoginModalHandler() {
    loginModal.classList.remove("show");
    setTimeout(() => {
      loginModal.classList.add("hidden");
      loginForm.reset();
    }, 300);
  }

  // Event listeners for authentication
  loginButton.addEventListener("click", openLoginModal);
  logoutButton.addEventListener("click", logout);
  closeLoginModal.addEventListener("click", closeLoginModalHandler);

  // Close login modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      closeLoginModalHandler();
    }
  });

  // Handle login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    await login(username, password);
  });

  function getLocalDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatAnnouncementDate(dateValue) {
    if (!dateValue) {
      return "";
    }
    const [year, month, day] = dateValue.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  async function fetchActiveAnnouncements() {
    try {
      const response = await fetch("/announcements");
      if (!response.ok) {
        throw new Error("Unable to load announcements");
      }
      renderAnnouncementBanner(await response.json());
    } catch (error) {
      console.error("Error fetching announcements:", error);
      announcementBanner.classList.add("hidden");
    }
  }

  function renderAnnouncementBanner(announcements) {
    announcementBanner.replaceChildren();
    announcements.forEach((announcement) => {
      const item = document.createElement("div");
      item.className = "announcement-banner-item";

      const icon = document.createElement("span");
      icon.className = "announcement-banner-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "📢";

      const message = document.createElement("p");
      message.className = "announcement-banner-message";
      message.textContent = announcement.message;

      item.append(icon, message);
      announcementBanner.appendChild(item);
    });
    announcementBanner.classList.toggle("hidden", announcements.length === 0);
  }

  function showAnnouncementFormMessage(text, type = "error") {
    announcementFormMessage.textContent = text;
    announcementFormMessage.className = `announcement-form-message ${type}`;
    announcementFormMessage.classList.remove("hidden");
  }

  function resetAnnouncementForm() {
    announcementForm.reset();
    editingAnnouncementId = null;
    announcementEditorTitle.textContent = "Create an announcement";
    saveAnnouncementButton.textContent = "Add announcement";
    cancelAnnouncementEditButton.classList.add("hidden");
    announcementFormMessage.textContent = "";
    announcementFormMessage.classList.add("hidden");
  }

  function closeAnnouncementsModal() {
    announcementsModal.classList.remove("show");
    manageAnnouncementsButton.setAttribute("aria-expanded", "false");
    setTimeout(() => {
      announcementsModal.classList.add("hidden");
      resetAnnouncementForm();
      const fallbackFocusTarget = manageAnnouncementsButton.classList.contains(
        "hidden"
      )
        ? loginButton
        : manageAnnouncementsButton;
      const focusTarget =
        announcementModalTrigger &&
        document.contains(announcementModalTrigger) &&
        !announcementModalTrigger.classList.contains("hidden")
          ? announcementModalTrigger
          : fallbackFocusTarget;
      focusTarget.focus();
      announcementModalTrigger = null;
    }, 300);
  }

  async function openAnnouncementsModal() {
    if (!currentUser) {
      showMessage("Please sign in to manage announcements.", "error");
      return;
    }
    if (!canManageAnnouncements()) {
      showMessage("You do not have permission to manage announcements.", "error");
      return;
    }
    resetAnnouncementForm();
    announcementModalTrigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : manageAnnouncementsButton;
    announcementsModal.classList.remove("hidden");
    manageAnnouncementsButton.setAttribute("aria-expanded", "true");
    setTimeout(() => {
      announcementsModal.classList.add("show");
      const [initialFocusTarget] = getFocusableElements(announcementsModal);
      (initialFocusTarget || closeAnnouncementsButton).focus();
    }, 10);
    await loadManagedAnnouncements();
  }

  async function loadManagedAnnouncements() {
    announcementList.innerHTML =
      '<p class="announcement-empty-state">Loading announcements...</p>';
    try {
      const response = await fetch(
        "/announcements/manage",
        withSessionCredentials()
      );
      if (response.status === 401) {
        handleAuthenticationFailure();
        closeAnnouncementsModal();
        return false;
      }
      if (response.status === 403) {
        handleAnnouncementAccessDenied();
        return false;
      }
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Unable to load announcements.");
      }
      renderManagedAnnouncements(result);
      return true;
    } catch (error) {
      announcementCount.textContent = "";
      announcementList.innerHTML = "";
      const errorMessage = document.createElement("p");
      errorMessage.className = "announcement-empty-state";
      errorMessage.textContent = error.message || "Unable to load announcements.";
      announcementList.appendChild(errorMessage);
      return false;
    }
  }

  function renderManagedAnnouncements(announcements) {
    announcementList.replaceChildren();
    announcementCount.textContent = String(announcements.length);
    if (announcements.length === 0) {
      const emptyState = document.createElement("p");
      emptyState.className = "announcement-empty-state";
      emptyState.textContent = "No announcements yet. Add one above to get started.";
      announcementList.appendChild(emptyState);
      return;
    }

    const today = getLocalDateString();
    announcements.forEach((announcement) => {
      const card = document.createElement("article");
      card.className = "announcement-card";
      const content = document.createElement("div");
      content.className = "announcement-card-content";
      const status = document.createElement("span");
      status.className = "announcement-status";

      if (announcement.expiration_date < today) {
        status.classList.add("announcement-status-expired");
        status.textContent = "Expired";
      } else if (announcement.start_date && announcement.start_date > today) {
        status.classList.add("announcement-status-scheduled");
        status.textContent = "Scheduled";
      } else {
        status.classList.add("announcement-status-active");
        status.textContent = "Active";
      }

      const message = document.createElement("p");
      message.className = "announcement-card-message";
      message.textContent = announcement.message;
      const dates = document.createElement("p");
      dates.className = "announcement-card-dates";
      dates.textContent = `${
        announcement.start_date
          ? `Starts ${formatAnnouncementDate(announcement.start_date)}`
          : "Available immediately"
      } · Expires ${formatAnnouncementDate(announcement.expiration_date)}`;
      content.append(status, message, dates);

      const actions = document.createElement("div");
      actions.className = "announcement-card-actions";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "announcement-edit-button";
      editButton.textContent = "Edit";
      editButton.setAttribute(
        "aria-label",
        `Edit announcement: ${announcement.message.slice(0, 45)}`
      );
      editButton.addEventListener("click", () => editAnnouncement(announcement));
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "announcement-delete-button";
      deleteButton.textContent = "Delete";
      deleteButton.setAttribute(
        "aria-label",
        `Delete announcement: ${announcement.message.slice(0, 45)}`
      );
      deleteButton.addEventListener("click", () =>
        deleteAnnouncement(announcement)
      );
      actions.append(editButton, deleteButton);
      card.append(content, actions);
      announcementList.appendChild(card);
    });
  }

  function editAnnouncement(announcement) {
    editingAnnouncementId = announcement.id;
    announcementMessageInput.value = announcement.message;
    announcementStartDateInput.value = announcement.start_date || "";
    announcementExpirationDateInput.value = announcement.expiration_date;
    announcementEditorTitle.textContent = "Edit announcement";
    saveAnnouncementButton.textContent = "Save changes";
    cancelAnnouncementEditButton.classList.remove("hidden");
    announcementFormMessage.classList.add("hidden");
    announcementMessageInput.focus();
  }

  async function deleteAnnouncement(announcement) {
    if (
      !window.confirm(
        "Delete this announcement? It will no longer appear on the website."
      )
    ) {
      return;
    }
    try {
      const response = await fetch(
        `/announcements/${encodeURIComponent(announcement.id)}`,
        withSessionCredentials({
          method: "DELETE",
        })
      );
      if (response.status === 401) {
        handleAuthenticationFailure();
        closeAnnouncementsModal();
        return;
      }
      if (response.status === 403) {
        handleAnnouncementAccessDenied();
        return;
      }
      const result = await parseResponsePayload(response);
      if (!response.ok) {
        throw new Error(result.detail || "Unable to delete announcement.");
      }
      if (editingAnnouncementId === announcement.id) {
        resetAnnouncementForm();
      }
      const [managedAnnouncementsReloaded] = await Promise.all([
        loadManagedAnnouncements(),
        fetchActiveAnnouncements(),
      ]);
      if (!managedAnnouncementsReloaded) {
        return;
      }
    } catch (error) {
      showAnnouncementFormMessage(error.message || "Unable to delete announcement.");
    }
  }

  manageAnnouncementsButton.addEventListener(
    "click",
    openAnnouncementsModal
  );
  closeAnnouncementsButton.addEventListener("click", closeAnnouncementsModal);
  cancelAnnouncementEditButton.addEventListener(
    "click",
    resetAnnouncementForm
  );
  announcementsModal.addEventListener("click", (event) => {
    if (event.target === announcementsModal) {
      closeAnnouncementsModal();
    }
  });
  announcementsModal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAnnouncementsModal();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = getFocusableElements(announcementsModal);
    if (focusableElements.length === 0) {
      event.preventDefault();
      return;
    }

    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstFocusableElement) {
      event.preventDefault();
      lastFocusableElement.focus();
    } else if (
      !event.shiftKey &&
      document.activeElement === lastFocusableElement
    ) {
      event.preventDefault();
      firstFocusableElement.focus();
    }
  });

  announcementForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const startDate = announcementStartDateInput.value || null;
    const expirationDate = announcementExpirationDateInput.value;
    if (startDate && startDate > expirationDate) {
      showAnnouncementFormMessage(
        "The start date must be on or before the expiration date."
      );
      announcementStartDateInput.focus();
      return;
    }

    const payload = {
      message: announcementMessageInput.value.trim(),
      start_date: startDate,
      expiration_date: expirationDate,
    };
    const isEditing = Boolean(editingAnnouncementId);
    const endpoint = isEditing
      ? `/announcements/${encodeURIComponent(editingAnnouncementId)}`
      : "/announcements";

    try {
      const response = await fetch(
        endpoint,
        withSessionCredentials({
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
      );
      if (response.status === 401) {
        handleAuthenticationFailure();
        closeAnnouncementsModal();
        return;
      }
      if (response.status === 403) {
        handleAnnouncementAccessDenied();
        return;
      }
      const result = await parseResponsePayload(response);
      if (!response.ok) {
        throw new Error(result.detail || "Unable to save announcement.");
      }
      resetAnnouncementForm();
      const [managedAnnouncementsReloaded] = await Promise.all([
        loadManagedAnnouncements(),
        fetchActiveAnnouncements(),
      ]);
      if (!managedAnnouncementsReloaded) {
        return;
      }
      showAnnouncementFormMessage(
        isEditing ? "Announcement updated." : "Announcement added.",
        "success"
      );
    } catch (error) {
      showAnnouncementFormMessage(error.message || "Unable to save announcement.");
    }
  });

  // Show loading skeletons
  function showLoadingSkeletons() {
    activitiesList.innerHTML = "";

    // Create more skeleton cards to fill the screen since they're smaller now
    for (let i = 0; i < 9; i++) {
      const skeletonCard = document.createElement("div");
      skeletonCard.className = "skeleton-card";
      skeletonCard.innerHTML = `
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-text short"></div>
        <div style="margin-top: 8px;">
          <div class="skeleton-line" style="height: 6px;"></div>
          <div class="skeleton-line skeleton-text short" style="height: 8px; margin-top: 3px;"></div>
        </div>
        <div style="margin-top: auto;">
          <div class="skeleton-line" style="height: 24px; margin-top: 8px;"></div>
        </div>
      `;
      activitiesList.appendChild(skeletonCard);
    }
  }

  // Format schedule for display - handles both old and new format
  function formatSchedule(details) {
    // If schedule_details is available, use the structured data
    if (details.schedule_details) {
      const days = details.schedule_details.days.join(", ");

      // Convert 24h time format to 12h AM/PM format for display
      const formatTime = (time24) => {
        const [hours, minutes] = time24.split(":").map((num) => parseInt(num));
        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
        return `${displayHours}:${minutes
          .toString()
          .padStart(2, "0")} ${period}`;
      };

      const startTime = formatTime(details.schedule_details.start_time);
      const endTime = formatTime(details.schedule_details.end_time);

      return `${days}, ${startTime} - ${endTime}`;
    }

    // Fallback to the string format if schedule_details isn't available
    return details.schedule;
  }

  // Function to determine activity type (this would ideally come from backend)
  function getActivityType(activityName, description) {
    const name = activityName.toLowerCase();
    const desc = description.toLowerCase();

    if (
      name.includes("soccer") ||
      name.includes("basketball") ||
      name.includes("sport") ||
      name.includes("fitness") ||
      desc.includes("team") ||
      desc.includes("game") ||
      desc.includes("athletic")
    ) {
      return "sports";
    } else if (
      name.includes("art") ||
      name.includes("music") ||
      name.includes("theater") ||
      name.includes("drama") ||
      desc.includes("creative") ||
      desc.includes("paint")
    ) {
      return "arts";
    } else if (
      name.includes("science") ||
      name.includes("math") ||
      name.includes("academic") ||
      name.includes("study") ||
      name.includes("olympiad") ||
      desc.includes("learning") ||
      desc.includes("education") ||
      desc.includes("competition")
    ) {
      return "academic";
    } else if (
      name.includes("volunteer") ||
      name.includes("community") ||
      desc.includes("service") ||
      desc.includes("volunteer")
    ) {
      return "community";
    } else if (
      name.includes("computer") ||
      name.includes("coding") ||
      name.includes("tech") ||
      name.includes("robotics") ||
      desc.includes("programming") ||
      desc.includes("technology") ||
      desc.includes("digital") ||
      desc.includes("robot")
    ) {
      return "technology";
    }

    // Default to "academic" if no match
    return "academic";
  }

  // Function to fetch activities from API with optional day and time filters
  async function fetchActivities() {
    // Show loading skeletons first
    showLoadingSkeletons();

    try {
      // Build query string with filters if they exist
      let queryParams = [];

      // Handle day filter
      if (currentDay) {
        queryParams.push(`day=${encodeURIComponent(currentDay)}`);
      }

      // Handle time range filter
      if (currentTimeRange) {
        const range = timeRanges[currentTimeRange];

        // Handle weekend special case
        if (currentTimeRange === "weekend") {
          // Don't add time parameters for weekend filter
          // Weekend filtering will be handled on the client side
        } else if (range) {
          // Add time parameters for before/after school
          queryParams.push(`start_time=${encodeURIComponent(range.start)}`);
          queryParams.push(`end_time=${encodeURIComponent(range.end)}`);
        }
      }

      const queryString =
        queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
      const response = await fetch(`/activities${queryString}`);
      const activities = await response.json();

      // Save the activities data
      allActivities = activities;

      // Apply search and filter, and handle weekend filter in client
      displayFilteredActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Function to display filtered activities
  function displayFilteredActivities() {
    // Clear the activities list
    activitiesList.innerHTML = "";

    // Apply client-side filtering - this handles category filter and search, plus weekend filter
    let filteredActivities = {};

    Object.entries(allActivities).forEach(([name, details]) => {
      const activityType = getActivityType(name, details.description);

      // Apply category filter
      if (currentFilter !== "all" && activityType !== currentFilter) {
        return;
      }

      // Apply weekend filter if selected
      if (currentTimeRange === "weekend" && details.schedule_details) {
        const activityDays = details.schedule_details.days;
        const isWeekendActivity = activityDays.some((day) =>
          timeRanges.weekend.days.includes(day)
        );

        if (!isWeekendActivity) {
          return;
        }
      }

      // Apply search filter
      const searchableContent = [
        name.toLowerCase(),
        details.description.toLowerCase(),
        formatSchedule(details).toLowerCase(),
      ].join(" ");

      if (
        searchQuery &&
        !searchableContent.includes(searchQuery.toLowerCase())
      ) {
        return;
      }

      // Activity passed all filters, add to filtered list
      filteredActivities[name] = details;
    });

    // Check if there are any results
    if (Object.keys(filteredActivities).length === 0) {
      activitiesList.innerHTML = `
        <div class="no-results">
          <h4>No activities found</h4>
          <p>Try adjusting your search or filter criteria</p>
        </div>
      `;
      return;
    }

    // Display filtered activities
    Object.entries(filteredActivities).forEach(([name, details]) => {
      renderActivityCard(name, details);
    });
  }

  // Function to render a single activity card
  function renderActivityCard(name, details) {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";

    // Calculate spots and capacity
    const totalSpots = details.max_participants;
    const takenSpots = details.participants.length;
    const spotsLeft = totalSpots - takenSpots;
    const capacityPercentage = (takenSpots / totalSpots) * 100;
    const isFull = spotsLeft <= 0;

    // Determine capacity status class
    let capacityStatusClass = "capacity-available";
    if (isFull) {
      capacityStatusClass = "capacity-full";
    } else if (capacityPercentage >= 75) {
      capacityStatusClass = "capacity-near-full";
    }

    // Determine activity type
    const activityType = getActivityType(name, details.description);
    const typeInfo = activityTypes[activityType];

    // Format the schedule using the new helper function
    const formattedSchedule = formatSchedule(details);

    // Create activity tag
    const tagHtml = `
      <span class="activity-tag" style="background-color: ${typeInfo.color}; color: ${typeInfo.textColor}">
        ${typeInfo.label}
      </span>
    `;

    // Create capacity indicator
    const capacityIndicator = `
      <div class="capacity-container ${capacityStatusClass}">
        <div class="capacity-bar-bg">
          <div class="capacity-bar-fill" style="width: ${capacityPercentage}%"></div>
        </div>
        <div class="capacity-text">
          <span>${takenSpots} enrolled</span>
          <span>${spotsLeft} spots left</span>
        </div>
      </div>
    `;

    activityCard.innerHTML = `
      ${tagHtml}
      <h4>${name}</h4>
      <p>${details.description}</p>
      <p class="tooltip">
        <strong>Schedule:</strong> ${formattedSchedule}
        <span class="tooltip-text">Regular meetings at this time throughout the semester</span>
      </p>
      ${capacityIndicator}
      <div class="participants-list">
        <h5>Current Participants:</h5>
        <ul>
          ${details.participants
            .map(
              (email) => `
            <li>
              ${email}
              ${
                currentUser
                  ? `
                <span class="delete-participant tooltip" data-activity="${name}" data-email="${email}">
                  ✖
                  <span class="tooltip-text">Unregister this student</span>
                </span>
              `
                  : ""
              }
            </li>
          `
            )
            .join("")}
        </ul>
      </div>
      <div class="activity-card-actions">
        ${
          currentUser
            ? `
          <button class="register-button" data-activity="${name}" ${
                isFull ? "disabled" : ""
              }>
            ${isFull ? "Activity Full" : "Register Student"}
          </button>
        `
            : `
          <div class="auth-notice">
            Teachers can register students.
          </div>
        `
        }
      </div>
    `;

    // Add click handlers for delete buttons
    const deleteButtons = activityCard.querySelectorAll(".delete-participant");
    deleteButtons.forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });

    // Add click handler for register button (only when authenticated)
    if (currentUser) {
      const registerButton = activityCard.querySelector(".register-button");
      if (!isFull) {
        registerButton.addEventListener("click", () => {
          openRegistrationModal(name);
        });
      }
    }

    activitiesList.appendChild(activityCard);
  }

  // Event listeners for search and filter
  searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value;
    displayFilteredActivities();
  });

  searchButton.addEventListener("click", (event) => {
    event.preventDefault();
    searchQuery = searchInput.value;
    displayFilteredActivities();
  });

  // Add event listeners to category filter buttons
  categoryFilters.forEach((button) => {
    button.addEventListener("click", () => {
      // Update active class
      categoryFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Update current filter and display filtered activities
      currentFilter = button.dataset.category;
      displayFilteredActivities();
    });
  });

  // Add event listeners to day filter buttons
  dayFilters.forEach((button) => {
    button.addEventListener("click", () => {
      // Update active class
      dayFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Update current day filter and fetch activities
      currentDay = button.dataset.day;
      fetchActivities();
    });
  });

  // Add event listeners for time filter buttons
  timeFilters.forEach((button) => {
    button.addEventListener("click", () => {
      // Update active class
      timeFilters.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Update current time filter and fetch activities
      currentTimeRange = button.dataset.time;
      fetchActivities();
    });
  });

  // Open registration modal
  function openRegistrationModal(activityName) {
    modalActivityName.textContent = activityName;
    activityInput.value = activityName;
    registrationModal.classList.remove("hidden");
    // Add slight delay to trigger animation
    setTimeout(() => {
      registrationModal.classList.add("show");
    }, 10);
  }

  // Close registration modal
  function closeRegistrationModalHandler() {
    registrationModal.classList.remove("show");
    setTimeout(() => {
      registrationModal.classList.add("hidden");
      signupForm.reset();
    }, 300);
  }

  // Event listener for close button
  closeRegistrationModal.addEventListener(
    "click",
    closeRegistrationModalHandler
  );

  // Close modal when clicking outside of it
  window.addEventListener("click", (event) => {
    if (event.target === registrationModal) {
      closeRegistrationModalHandler();
    }
  });

  // Create and show confirmation dialog
  function showConfirmationDialog(message, confirmCallback) {
    // Create the confirmation dialog if it doesn't exist
    let confirmDialog = document.getElementById("confirm-dialog");
    if (!confirmDialog) {
      confirmDialog = document.createElement("div");
      confirmDialog.id = "confirm-dialog";
      confirmDialog.className = "modal hidden";
      confirmDialog.innerHTML = `
        <div class="modal-content">
          <h3>Confirm Action</h3>
          <p id="confirm-message"></p>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
            <button id="cancel-button" class="cancel-btn">Cancel</button>
            <button id="confirm-button" class="confirm-btn">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmDialog);

      // Style the buttons
      const cancelBtn = confirmDialog.querySelector("#cancel-button");
      const confirmBtn = confirmDialog.querySelector("#confirm-button");

      cancelBtn.style.backgroundColor = "#f1f1f1";
      cancelBtn.style.color = "#333";

      confirmBtn.style.backgroundColor = "#dc3545";
      confirmBtn.style.color = "white";
    }

    // Set the message
    const confirmMessage = document.getElementById("confirm-message");
    confirmMessage.textContent = message;

    // Show the dialog
    confirmDialog.classList.remove("hidden");
    setTimeout(() => {
      confirmDialog.classList.add("show");
    }, 10);

    // Handle button clicks
    const cancelButton = document.getElementById("cancel-button");
    const confirmButton = document.getElementById("confirm-button");

    // Remove any existing event listeners
    const newCancelButton = cancelButton.cloneNode(true);
    const newConfirmButton = confirmButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    // Add new event listeners
    newCancelButton.addEventListener("click", () => {
      confirmDialog.classList.remove("show");
      setTimeout(() => {
        confirmDialog.classList.add("hidden");
      }, 300);
    });

    newConfirmButton.addEventListener("click", () => {
      confirmCallback();
      confirmDialog.classList.remove("show");
      setTimeout(() => {
        confirmDialog.classList.add("hidden");
      }, 300);
    });

    // Close when clicking outside
    confirmDialog.addEventListener("click", (event) => {
      if (event.target === confirmDialog) {
        confirmDialog.classList.remove("show");
        setTimeout(() => {
          confirmDialog.classList.add("hidden");
        }, 300);
      }
    });
  }

  // Handle unregistration with confirmation
  async function handleUnregister(event) {
    // Check if user is authenticated
    if (!currentUser) {
      showMessage(
        "You must be logged in as a teacher to unregister students.",
        "error"
      );
      return;
    }

    const activity = event.target.dataset.activity;
    const email = event.target.dataset.email;

    // Show confirmation dialog
    showConfirmationDialog(
      `Are you sure you want to unregister ${email} from ${activity}?`,
      async () => {
        try {
          const query = new URLSearchParams({ email });
          const response = await fetch(
            `/activities/${encodeURIComponent(activity)}/unregister?${query.toString()}`,
            withSessionCredentials({
              method: "POST",
            })
          );

          if (response.status === 401) {
            handleAuthenticationFailure();
            return;
          }

          const result = await response.json();

          if (response.ok) {
            showMessage(result.message, "success");
            // Refresh the activities list
            fetchActivities();
          } else {
            showMessage(result.detail || "An error occurred", "error");
          }
        } catch (error) {
          showMessage("Failed to unregister. Please try again.", "error");
          console.error("Error unregistering:", error);
        }
      }
    );
  }

  // Show message function
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    // Hide message after 5 seconds
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Check if user is authenticated
    if (!currentUser) {
      showMessage(
        "You must be logged in as a teacher to register students.",
        "error"
      );
      return;
    }

    const email = document.getElementById("email").value;
    const activity = activityInput.value;

    try {
      const query = new URLSearchParams({ email });
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?${query.toString()}`,
        withSessionCredentials({
          method: "POST",
        })
      );

      if (response.status === 401) {
        handleAuthenticationFailure();
        return;
      }

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        closeRegistrationModalHandler();
        // Refresh the activities list after successful signup
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Expose filter functions to window for future UI control
  window.activityFilters = {
    setDayFilter,
    setTimeRangeFilter,
  };

  // Initialize app
  checkAuthentication();
  initializeFilters();
  fetchActivities();
  fetchActiveAnnouncements();
});
