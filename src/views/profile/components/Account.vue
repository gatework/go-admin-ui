<template>
  <a-form :model="userForm">
    <a-form-item label="Name">
      <a-input v-model.trim="userForm.name" />
    </a-form-item>
    <a-form-item label="Email">
      <a-input v-model.trim="userForm.email" />
    </a-form-item>
    <a-form-item>
      <a-button type="primary" @click="submit">Update</a-button>
    </a-form-item>
  </a-form>
</template>

<script>
import { Message } from '@arco-design/web-vue'
export default {
  name: 'UserAccount',
  props: {
    user: {
      type: Object,
      default: () => {
        return {
          name: '',
          email: ''
        }
      }
    }
  },
  data() {
    return {
      userForm: { ...this.user }
    }
  },
  methods: {
    submit() {
      Message.success({
        content: 'User information has been updated successfully',
        duration: 5 * 1000
      })
    }
  }
}
</script>
