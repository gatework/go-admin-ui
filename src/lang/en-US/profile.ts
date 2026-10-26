export default {
  alignment: { 'description': 'Manage your profile, password and preferences on this browser.', 'localPreferences': 'Preferences are saved in this browser and can be reset at any time.', 'loadError': 'Could not load your profile. Please retry.', 'backendDifferences': 'API tokens, session management, notifications and contact email verification are currently unavailable.' },
  title: 'Profile',
  username: 'Username',
  phone: 'Phone Number',
  email: 'Email',
  dept: 'Department',
  role: 'Roles',
  createdAt: 'Created',
  noRole: 'None',

  basic: 'Basic Information',
  tabs: {
    info: 'Basic Information',
    password: 'Change Password'
  },

  info: {
    nickName: 'Nickname',
    phone: 'Phone Number',
    phoneHint: 'Enter an 11-digit mainland China mobile number.',
    email: 'Email',
    sex: 'Gender',
    male: 'Male',
    female: 'Female',
    rules: {
      nickName: 'Nickname is required',
      emailRequired: 'Email is required',
      emailFormat: 'Enter a valid email address',
      phoneRequired: 'Phone number is required',
      phoneFormat: 'Enter a valid phone number'
    }
  },

  password: {
    old: 'Current Password',
    oldPlaceholder: 'Enter your current password',
    new: 'New Password',
    newPlaceholder: 'Enter new password',
    hint: 'Use 6–20 characters for the new password.',
    save: 'Change password',
    confirm: 'Confirm New Password',
    confirmPlaceholder: 'Confirm new password',
    rules: {
      oldRequired: 'Current password is required',
      newRequired: 'New password is required',
      length: 'Must be between 6 and 20 characters',
      confirmRequired: 'Please confirm the password',
      mismatch: 'The two passwords do not match'
    }
  },

  avatar: {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    rotateLeft: 'Rotate left',
    rotateRight: 'Rotate right',
    fileRule: 'Choose a JPG, PNG or WebP image up to 5 MB.',

    hint: 'Change avatar',
    upload: 'Choose image',
    submit: 'Save avatar',
    dialogTitle: 'Change Avatar',
    wrongType: 'Choose a JPG, PNG or WebP image.'
  },

  save: 'Save profile',
  close: 'Close'
}
