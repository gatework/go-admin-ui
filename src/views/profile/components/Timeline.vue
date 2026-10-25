<template>
  <div class="block">
    <a-timeline>
      <a-timeline-item v-for="(item,index) of timeline" :key="index" :label="item.timestamp" position="top">
        <a-card>
          <h4>{{ item.title }}</h4>
          <p>{{ item.content }}</p>
        </a-card>
      </a-timeline-item>
    </a-timeline>
  </div>
</template>

<script>
export default {
  name: 'UserTimeline',
  data() {
    return {
      timeline: [
        {
          timestamp: '2019/4/20',
          title: 'Update Github template',
          content: 'PanJiaChen committed 2019/4/20 20:46'
        },
        {
          timestamp: '2019/4/21',
          title: 'Update Github template',
          content: 'PanJiaChen committed 2019/4/21 20:46'
        },
        {
          timestamp: '2019/4/22',
          title: 'Build Template',
          content: 'PanJiaChen committed 2019/4/22 20:46'
        },
        {
          timestamp: '2019/4/23',
          title: 'Release New Version',
          content: 'PanJiaChen committed 2019/4/23 20:46'
        }
      ]
    }
  }
}
</script>
