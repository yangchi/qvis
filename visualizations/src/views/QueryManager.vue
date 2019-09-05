<template>
    <div>
        <QueryManagerContainer />
    </div>
</template> 

<script lang="ts">
    import { Component, Vue } from "vue-property-decorator";
    import QueryManagerContainer from "@/components/query/QueryManagerContainer.vue";

    @Component({
        components: {
            QueryManagerContainer,
        },
    })
    export default class QueryManager extends Vue {} 
</script>
