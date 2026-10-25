<template>
  <div v-if="errorLogs.length>0">
    <a-badge dot style="line-height: 25px;margin-top: -5px;" @click="dialogTableVisible=true">
      <a-button style="padding: 8px 10px;" size="small" status="danger">
        <svg-icon icon-class="bug" />
      </a-button>
    </a-badge>

    <AppModal v-model:visible="dialogTableVisible" width="80%">
      <template #title>
        <span style="padding-right: 10px;">Error Log</span>
        <a-button size="small" type="primary" @click="clearAll"><i class="ri-delete-bin-line" style="margin-right:4px;" />Clear All</a-button>
      </template>
      <a-table :data="errorLogs" :pagination="false"><template #columns>
        <a-table-column title="Message">
          <template #cell="{record: row}">
            <div>
              <span class="message-title">Msg:</span>
              <a-tag color="red">
                {{ row.err.message }}
              </a-tag>
            </div>
            <br>
            <div>
              <span class="message-title" style="padding-right: 10px;">Info: </span>
              <a-tag color="orange">
                {{ row.vm?.$options?.name }} error in {{ row.info }}
              </a-tag>
            </div>
            <br>
            <div>
              <span class="message-title" style="padding-right: 16px;">Url: </span>
              <a-tag color="green">
                {{ row.url }}
              </a-tag>
            </div>
          </template>
        </a-table-column>
        <a-table-column title="Stack">
          <template #cell="scope">
            {{ scope.record.err.stack }}
          </template>
        </a-table-column>
      </template></a-table>
    </AppModal>
  </div>
</template>

<script>
import AppModal from '@/components/AppModal/index.vue'
import { mapState, mapActions } from 'pinia'
import { useErrorLogStore } from '@/stores/errorLog'

export default {
  components: { AppModal },
  name: 'ErrorLog',
  data() {
    return {
      dialogTableVisible: false
    }
  },
  computed: {
    // Pinia's mapState works in the Options API, so consuming a ported store
    // does not force this component to move to <script setup> yet.
    ...mapState(useErrorLogStore, { errorLogs: 'logs' })
  },
  methods: {
    ...mapActions(useErrorLogStore, ['clearErrorLog']),
    clearAll() {
      this.dialogTableVisible = false
      this.clearErrorLog()
    }
  }
}
</script>

<style scoped>
.message-title {
  font-size: 16px;
  color: #333;
  font-weight: bold;
  padding-right: 8px;
}
</style>
