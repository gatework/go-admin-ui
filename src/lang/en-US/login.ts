export default {
  subtitle: 'Sign in to motor with your username and password.',
  // The field is 账号 in Chinese but binds to `username`, and Username is what
  // a browser password manager expects to see next to it.
  username: 'Username',
  usernamePlaceholder: 'Enter username',
  password: 'Password',
  passwordPlaceholder: 'Enter password',
  captcha: 'Verification code',
  captchaPlaceholder: 'Enter 6 digits',
  captchaRefresh: 'Refresh verification code',
  submit: 'Sign in',
  submitting: 'Signing in',
  forgotPassword: 'Contact the system administrator to reset your password',
  terminalAlt: 'motor startup sequence',
  rules: {
    username: 'Username is required',
    password: 'Password is required',
    captcha: 'Captcha is required',
    captchaFormat: 'Enter a 6-digit verification code'
  }
}
