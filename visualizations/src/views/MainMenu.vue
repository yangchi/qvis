<template>
    <b-container id="MainMenu" fluid>
        <!--
        <b-row>
            <b-col cols="1" md="auto">qvis</b-col>
            <b-col>
                <router-link to="/query">Connection Query</router-link> |
                <router-link to="/files">Manage files</router-link> |
                <router-link to="/sequence">Sequence</router-link> |
                <router-link to="/congestion">Congestion</router-link>
            </b-col>
        </b-row>
        -->
        <!-- <b-tabs
            active-nav-item-class="font-weight-bold text-uppercase text-danger"
            active-tab-class="font-weight-bold text-success"
            content-class="mt-3"
        >
            <b-tab title="First" active><router-link to="/query">Connection Query</router-link></b-tab>
            <b-tab title="First" active><router-link to="/files">Manage files</router-link></b-tab>
            <b-tab title="Second"><b-link to="/sequence">Sequence</b-link></b-tab>
            <b-tab title="Disabled" disabled><p>I'm a disabled tab!</p></b-tab>
        </b-tabs> -->
        <b-row>
            <b-col cols="1" md="auto" class="align-middle"><h3 style="width: 290px;">qvis</h3></b-col>
            <b-col>
                <b-nav tabs align="center">
                    <b-nav-item to="/query" class="query-link" :active="this.$route.fullPath === '/query' || $route.fullPath === ''">
                        Connection Query
                    </b-nav-item>
                    <b-nav-item to="/files" class="files-link" :active="this.$route.fullPath === '/files' || $route.fullPath === ''">
                        Manage files
                    </b-nav-item>
                    <b-nav-item to="/sequence" class="sequence-link" :active="$route.fullPath === '/sequence'">
                        Sequence
                    </b-nav-item>
                    <b-nav-item to="/congestion" class="congestion-link" :active="$route.fullPath === '/congestion'">
                        Congestion
                    </b-nav-item>
                    <b-nav-item to="/stats" class="stats-link" :active="$route.fullPath === '/stats'">
                        qlog stats
                    </b-nav-item>
                </b-nav>
            </b-col>
            <b-col cols="1" md="auto">
                <b-button variant="success" href="https://fb.workplace.com/groups/646964542156536/" target="_blank" style="margin-right: 5px;">Quic@FB Group</b-button>
                <b-button variant="danger"  href="https://fb.workplace.com/groups/248214662741731/" target="_blank">Mvfst support group</b-button>
            </b-col>
        </b-row>
    </b-container>
</template>

<style scoped>
    #MainMenu{
        width: 100%;
        background-color: black;
        color: white;
        padding-top: 5px;
        /*
        text-align: center;
        line-height: 1em;
        height: 25px;
        padding-top: 10px;
        */
    }

    #MainMenu .nav-tabs{
        border-bottom: none;
    }

    #MainMenu .nav-tabs .nav-item {
        margin-left: 3px;
    }

    #MainMenu .nav-tabs .nav-link {
        background-color: lightgrey;
        color: black;
        border-bottom: none;
    }

    /* using the bootstrapvue built-in "active-class" doesn't work due to precedence weirdness*/
    #MainMenu li.query-link a.active {
        color: black;
        font-weight: bold;
        background-color: #fff;
        border-bottom-color: #fff;
    }

    #MainMenu li.files-link a.active {
        color: black;
        font-weight: bold;
        background-color: #fff;
        border-bottom-color: #fff;
    }

    #MainMenu li.sequence-link a.active {
        color: black;
        font-weight: bold;
        background-color: #cce5ff;
        border-bottom-color: #cce5ff;
    }

    #MainMenu li.congestion-link a.active {
        color: black;
        font-weight: bold;
        background-color: #d4edda;
        border-bottom-color: #d4edda;
    }

    #MainMenu li.stats-link a.active {
        color: black;
        font-weight: bold;
        background-color: #fff3cd;
        border-bottom-color: #fff3cd;
    }

    /* #MainMenu a.router-link-exact-active {
        background-color: white;
        color: black;
    } */

</style>

<script lang="ts">
    import { getModule } from "vuex-module-decorators";
    import { Component, Vue } from "vue-property-decorator";
    import HelloWorld from "@/components/HelloWorld.vue";

    import ConnectionStore from "@/store/ConnectionStore";
    import ConnectionGroup from "@/data/ConnectionGroup";

    @Component({})
    export default class VUEDebug extends Vue {
        public mounted(){
            console.log( this.$route );
        }
    }

</script>